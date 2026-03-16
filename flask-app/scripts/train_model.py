import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import joblib
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'price-model.pkl')
DEFAULT_DATASET_PATH = os.path.join(BASE_DIR, 'models', 'data.csv')


def train_model_on_data(dataset_path):
    """
    Train a fresh price prediction model from a CSV dataset.

    Args:
    dataset_path (str): The path to the CSV dataset used for training.

    Returns:
    str: The file path of the saved model.
    """
    # Load the dataset
    data = pd.read_csv(dataset_path)

    # Ensure 'Date' column exists and convert it to a numeric format (e.g., Unix timestamp)
    if 'Date' not in data.columns:
        raise ValueError("'Date' column is missing from the dataset")

    data['Date'] = pd.to_datetime(data['Date'])
    data['Date'] = data['Date'].apply(lambda x: x.timestamp())  # Convert to Unix timestamp

    # Identify the target column (we assume the last column is the target price column)
    target = data.columns[-1]  # Assumes last column is the target

    # Automatically extract all columns except 'Date' and the target as features
    features = [col for col in data.columns if col != 'Date' and col != target]
    if not features:
        raise ValueError('No feature columns found in the dataset')

    # Select features and target variable
    training_data = data.dropna(subset=[target]).copy()
    if training_data.empty:
        raise ValueError('Dataset does not contain any rows with a target value')

    X = training_data[features]
    y = training_data[target]

    # Split data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler()),
        ('regressor', LinearRegression()),
    ])

    # Train the model using the dataset
    model.fit(X_train, y_train)

    # Store helpful metadata for the API endpoint.
    model.feature_names_ = features
    model.target_name_ = target
    model.training_row_count_ = int(len(training_data))
    model.dataset_path_ = dataset_path

    # Save the retrained model
    model_file = MODEL_PATH
    joblib.dump(model, model_file)

    return model_file


def train_new_model(dataset_path=DEFAULT_DATASET_PATH):
    return train_model_on_data(dataset_path)


if __name__ == '__main__':
    try:
        retrained_model_file = train_new_model()
        print(f"Model retrained and saved as {retrained_model_file}")
    except Exception as e:
        print(f"Error retraining model: {e}")
