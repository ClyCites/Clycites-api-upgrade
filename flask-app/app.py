from flask import Flask, request, render_template, jsonify
import joblib  # Model loading
import os

from app.modelController import train_model

app = Flask(__name__)

# Load model function
def load_model():
    try:
        model = joblib.load('models/price-model.pkl')
        return model
    except Exception as e:
        return str(e)

def run_prediction(features):
    model = load_model()
    if isinstance(model, str):
        return {"message": f"Error loading model: {model}"}, 500

    prediction = model.predict([features])
    return {"prediction": prediction[0]}

# Route to show the prediction form
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/train', methods=['POST'])
def train():
    return train_model()

# Route to make price prediction from form data
@app.route('/predict', methods=['POST'])
def predict():
    try:
        feature_1 = float(request.form.get('feature_1'))  # Modify according to your feature names
        feature_2 = float(request.form.get('feature_2'))  # Modify according to your feature names
        features = [feature_1, feature_2]  # Add more features if necessary

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
        feature_1 = float(payload.get('feature_1'))
        feature_2 = float(payload.get('feature_2'))
        features = [feature_1, feature_2]

        result = run_prediction(features)
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
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=port)
