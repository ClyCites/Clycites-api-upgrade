from flask import Flask, request, render_template, jsonify
import joblib  # Model loading
import os
import pandas as pd
import math

from modelController import train_model

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'price-model.pkl')
DATASET_PATH = os.path.join(BASE_DIR, 'models', 'data.csv')

app = Flask(__name__)


def to_json_safe(value):
    if value is None or isinstance(value, (str, bool)):
        return value

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return value

    if isinstance(value, dict):
        return {str(key): to_json_safe(item) for key, item in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [to_json_safe(item) for item in value]

    if hasattr(value, 'item'):
        try:
            return to_json_safe(value.item())
        except Exception:
            pass

    if hasattr(value, 'tolist'):
        try:
            return to_json_safe(value.tolist())
        except Exception:
            pass

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    return str(value)


def get_dataset_content():
    dataset = pd.read_csv(DATASET_PATH)
    dataset = dataset.astype(object).where(pd.notnull(dataset), None)

    return {
        "path": DATASET_PATH,
        "rowCount": len(dataset),
        "columnCount": len(dataset.columns),
        "columns": list(dataset.columns),
        "rows": dataset.to_dict(orient='records'),
    }


def get_model_content(model):
    attributes = {}
    for name, value in vars(model).items():
        if name.startswith('_') or callable(value):
            continue
        attributes[name] = to_json_safe(value)

    params = {}
    if hasattr(model, 'get_params'):
        try:
            params = to_json_safe(model.get_params(deep=False))
        except Exception as e:
            params = {"error": str(e)}

    return {
        "path": MODEL_PATH,
        "loaded": True,
        "className": type(model).__name__,
        "module": type(model).__module__,
        "params": params,
        "attributes": attributes,
    }


# Load model function
def load_model():
    try:
        model = joblib.load(MODEL_PATH)
        return model
    except Exception as e:
        return str(e)


def build_feature_vector(model, payload):
    feature_names = list(getattr(model, 'feature_names_', []))

    if isinstance(payload, dict):
        if feature_names and any(name in payload for name in feature_names):
            return [payload.get(name) for name in feature_names]

        legacy_values = []
        index = 1
        while f'feature_{index}' in payload:
            legacy_values.append(payload.get(f'feature_{index}'))
            index += 1

        if feature_names and legacy_values:
            padded = legacy_values[:len(feature_names)]
            while len(padded) < len(feature_names):
                padded.append(None)
            return padded

        if 'features' in payload and isinstance(payload['features'], list):
            return payload['features']

    return payload


def normalize_feature_vector(feature_vector):
    normalized = []
    for value in feature_vector:
        if value in (None, ''):
            normalized.append(float('nan'))
        else:
            normalized.append(float(value))
    return normalized


def run_prediction(features):
    model = load_model()
    if isinstance(model, str):
        return {"message": f"Error loading model: {model}"}, 500

    feature_vector = build_feature_vector(model, features)
    normalized_feature_vector = normalize_feature_vector(feature_vector)
    feature_names = list(getattr(model, 'feature_names_', []))
    if feature_names and len(feature_names) == len(normalized_feature_vector):
        prediction_frame = pd.DataFrame([normalized_feature_vector], columns=feature_names)
        prediction = model.predict(prediction_frame)
    else:
        prediction = model.predict([normalized_feature_vector])
    return {"prediction": to_json_safe(prediction[0]), "features": to_json_safe(feature_vector)}

# Route to show the prediction form
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/train', methods=['POST'])
def train():
    return train_model()


@app.route('/api/model', methods=['GET'])
def api_model():
    try:
        response = {
            "success": True,
            "data": {
                "dataset": get_dataset_content(),
            },
        }

        model = load_model()
        if isinstance(model, str):
            response["data"]["model"] = {
                "path": MODEL_PATH,
                "loaded": False,
                "error": model,
            }
            return jsonify(response), 200

        response["data"]["model"] = get_model_content(model)
        return jsonify(response), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
        }), 500

# Route to make price prediction from form data
@app.route('/predict', methods=['POST'])
def predict():
    try:
        features = {
            key: (float(value) if value not in (None, '') else None)
            for key, value in request.form.items()
        }

        result = run_prediction(features)
        if isinstance(result, tuple):
            return jsonify(result[0]), result[1]

        return render_template('index.html', prediction=result["prediction"])  # Display the result
    except Exception as e:
        return jsonify({"message": f"Error making prediction: {str(e)}"})

@app.route('/api/predict', methods=['POST'])
def api_predict():
    try:
        payload = request.get_json(silent=True) or {}

        result = run_prediction(payload)
        if isinstance(result, tuple):
            return jsonify(result[0]), result[1]

        return jsonify(result)
    except Exception as e:
        return jsonify({"message": f"Error making prediction: {str(e)}"}), 400

@app.route('/api/train', methods=['POST'])
def api_train():
    return train_model()

if __name__ == "__main__":
    port = int(os.getenv('PRICE_MONITOR_PORT', '5010'))
    debug = os.getenv('FLASK_DEBUG', 'true').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=port)
