import json
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib
import os

def load_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, 'ai_engine', 'data', 'destinations.json')
    
    with open(data_path, 'r') as f:
        data = json.load(f)
        
    return data['destinations']

def prepare_activity_training_data(destinations):
    records = []
    
    # We want to train a model that, given a user's (Style, Interest, CostTier),
    # recommends whether an activity is a good fit.
    # To do this simply, we will mock up "user profiles" that match activity categories.
    
    for dest in destinations:
        dest_name = dest['name']
        for act in dest['activities']:
            category = act['category']
            
            # Create synthetic "positive" examples:
            # If user likes the category, they will like this activity.
            for tier in act['cost_tier']:
                records.append({
                    'activity_title': act['title'],
                    'destination': dest_name,
                    'time_of_day': act['time_of_day'],
                    'duration_hours': act['duration_hours'],
                    'user_interest': category, 
                    'user_budget_tier': tier,
                    'is_match': 1
                })
                
            # Create some "negative" examples for contrast
            # If user likes "Adventure" but this is "Relaxation", lower probability match
            all_cats = ["Culture", "History", "Relaxation", "Adventure", "Nature", "Wildlife", "Religious", "Trekking"]
            for bad_cat in all_cats:
                if bad_cat != category:
                    records.append({
                        'activity_title': act['title'],
                        'destination': dest_name,
                        'time_of_day': act['time_of_day'],
                        'duration_hours': act['duration_hours'],
                        'user_interest': bad_cat,
                        'user_budget_tier': act['cost_tier'][0],
                        'is_match': 0
                    })
                    
    df = pd.DataFrame(records)
    return df

def train_activity_model():
    print("Loading datasets...")
    destinations = load_data()
    df = prepare_activity_training_data(destinations)
    
    print("Feature engineering...")
    # Features: destination (OneHot), user_interest(OneHot), user_budget_tier(OneHot)
    X = pd.get_dummies(df[['destination', 'user_interest', 'user_budget_tier']])
    y = df['is_match']
    
    print("Training Random Forest Classifier...")
    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X, y)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, 'ai_engine', 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    joblib.dump(clf, os.path.join(models_dir, 'activity_model.pkl'))
    
    # Save the expected feature columns so the inference engine knows how to align input
    model_columns = list(X.columns)
    joblib.dump(model_columns, os.path.join(models_dir, 'model_columns.pkl'))
    
    print(f"Model saved to {models_dir}/activity_model.pkl")

def train_tips_tfidf():
    # A simple TF-IDF to find the best tip based on destination name and categories
    destinations = load_data()
    
    corpus = []
    dest_names = []
    
    for dest in destinations:
        dest_names.append(dest['name'])
        # The document is a combination of its name, categories, and the tip itself
        doc = f"{dest['name']} {' '.join(dest['categories'])} {dest['tips']}"
        corpus.append(doc)
        
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(corpus)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, 'ai_engine', 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    joblib.dump(vectorizer, os.path.join(models_dir, 'tfidf_vectorizer.pkl'))
    joblib.dump(tfidf_matrix, os.path.join(models_dir, 'tfidf_matrix.pkl'))
    joblib.dump(dest_names, os.path.join(models_dir, 'tfidf_destinations.pkl'))
    
    print("TF-IDF Tips Model saved.")

if __name__ == "__main__":
    train_activity_model()
    train_tips_tfidf()
