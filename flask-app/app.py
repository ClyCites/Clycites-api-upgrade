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
    model = load_model()
    if isinstance(model, str):
        return jsonify({"message": f"Error loading model: {model}"})
    
    try:
        # Get form data (features)
        feature_1 = float(request.form.get('feature_1'))  # Modify according to your feature names
        feature_2 = float(request.form.get('feature_2'))  # Modify according to your feature names
        features = [feature_1, feature_2]  # Add more features if necessary
        
        # Make prediction using the model
        prediction = model.predict([features])
        return render_template('index.html', prediction=prediction[0])  # Display the result
        
    except Exception as e:
        return jsonify({"message": f"Error making prediction: {str(e)}"})

if __name__ == "__main__":
    port = int(os.getenv('PRICE_MONITOR_PORT', '5010'))
    debug = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(debug=debug, host='0.0.0.0', port=port)
