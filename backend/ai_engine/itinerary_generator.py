import json
import os
import random
import pandas as pd
import joblib

class ItineraryEngine:
    def __init__(self):
        import os
        from pathlib import Path
        
        # Absolute path to `backend/ai_engine`
        base_dir = os.path.join(Path(__file__).resolve().parent)
        
        # Load datasets
        with open(os.path.join(base_dir, 'data', 'destinations.json'), 'r') as f:
            self.destinations = json.load(f)['destinations']
        with open(os.path.join(base_dir, 'data', 'rules.json'), 'r') as f:
            self.rules = json.load(f)['budget_multipliers']
            
        # Load models
        self.clf = joblib.load(os.path.join(base_dir, 'models', 'activity_model.pkl'))
        self.model_columns = joblib.load(os.path.join(base_dir, 'models', 'model_columns.pkl'))
        
        self.tfidf_vectorizer = joblib.load(os.path.join(base_dir, 'models', 'tfidf_vectorizer.pkl'))
        self.tfidf_matrix = joblib.load(os.path.join(base_dir, 'models', 'tfidf_matrix.pkl'))
        self.tfidf_destinations = joblib.load(os.path.join(base_dir, 'models', 'tfidf_destinations.pkl'))

        # Map frontend travel styles to model interests broadly
        self.style_mapping = {
            "trekking": "Trekking",
            "nature": "Nature",
            "culture": "Culture",
            "wildlife": "Wildlife",
            "religious": "Religious",
            "relax": "Relaxation"
        }

    def _determine_budget_tier(self, budget_per_person):
        if budget_per_person < 20000: return 'backpacking'
        elif budget_per_person < 60000: return 'budget'
        elif budget_per_person < 150000: return 'standard'
        else: return 'luxury'

    def _score_activity(self, activity, destination_name, user_interest, budget_tier):
        # Create a single-row dataframe matching training features
        input_data = {
            f"destination_{destination_name}": 1,
            f"user_interest_{user_interest}": 1,
            f"user_budget_tier_{budget_tier}": 1
        }
        
        # Build dataframe with all expected columns set to 0 initially
        df = pd.DataFrame(columns=self.model_columns)
        df.loc[0] = 0
        
        # Populate the 1s
        for key, val in input_data.items():
            if key in df.columns:
                df[key] = val
                
        # Get probability of it being a match
        prob = self.clf.predict_proba(df)[0][1]
        
        # Add a slight random variance for variety between generations
        return prob + random.uniform(0.0, 0.1)

    def _get_best_tips(self, destination_name):
        try:
            idx = self.tfidf_destinations.index(destination_name)
            dest = next(d for d in self.destinations if d['name'] == destination_name)
            return [dest['tips'], "Stay hydrated and carry a reusable water bottle.", "Bargaining is common in local markets.", "Download offline maps before heading out."]
        except ValueError:
            return ["Stay hydrated and carry a reusable water bottle.", "Respect local culture by dressing modestly.", "Carry enough cash as ATMs may be scarce."]

    def generate(self, destination_name, days, total_budget, travel_style, interests, start_date=None, travelers=1):
        budget_per_person = int(total_budget) / int(travelers)
        budget_tier = self._determine_budget_tier(budget_per_person)
        
        dest_data = next((d for d in self.destinations if d['name'] == destination_name), None)
        if not dest_data:
            # Fallback if destination isn't in DB yet
            dest_data = self.destinations[0]

        primary_interest = self.style_mapping.get(travel_style, "Adventure")
        if interests and len(interests) > 0:
            # Try to map frontend interest to DB category if possible
            first_interest = str(interests[0]).capitalize()
            if first_interest in ["Mountains", "Lakes"]: primary_interest = "Nature"
            if first_interest == "Temples": primary_interest = "Religious"

        # Score all activities for this destination
        scored_activities = []
        for act in dest_data['activities']:
            score = self._score_activity(act, destination_name, primary_interest, budget_tier)
            scored_activities.append((score, act))
            
        # Sort by best fit
        scored_activities.sort(key=lambda x: x[0], reverse=True)
        
        itinerary_days = []
        activity_pool = [act for score, act in scored_activities]
        
        for day in range(1, int(days) + 1):
            day_plan = {
                "day_number": day,
                "date_label": f"Day {day}",
                "title": f"Exploring {destination_name} - Day {day}",
                "altitude": "Varies",
                "accommodation": f"{budget_tier.capitalize()} stay",
                "meals": "Breakfast included",
                "activities": [],
                "local_tips": dest_data['tips']
            }
            
            # Select 1 morning, 1 afternoon, 1 evening activity
            for tod in ["Morning", "Afternoon", "Evening"]:
                # Find best remaining activity for this time
                best_act = next((a for a in activity_pool if a['time_of_day'] == tod), None)
                if not best_act:
                    # Fallback to any time
                    best_act = next((a for a in activity_pool), None)
                    
                if best_act:
                    day_plan["activities"].append({
                        "time_of_day": tod,
                        "title": best_act['title'],
                        "description": f"Enjoy a {best_act['duration_hours']}-hour {best_act['category'].lower()} experience suitable for a {budget_tier} budget."
                    })
                    activity_pool.remove(best_act)
                    
            # If we run out of activities, reset the pool for following days
            if len(activity_pool) < 3:
                activity_pool = [act for score, act in scored_activities]
                
            itinerary_days.append(day_plan)

        # Budget Allocation
        multipliers = self.rules.get(budget_tier, self.rules['standard'])
        breakdown = [
            {"category": "Accommodation", "amount": int(total_budget * multipliers['accommodation'])},
            {"category": "Food & Meals", "amount": int(total_budget * multipliers['food'])},
            {"category": "Transport", "amount": int(total_budget * multipliers['transport'])},
            {"category": "Activities", "amount": int(total_budget * multipliers['activities'])}
        ]

        return {
            "destination": destination_name,
            "budget": total_budget,
            "itinerary": {
                "trip_summary": f"Your personalized {days}-day {budget_tier} trip to {destination_name}, focused on {primary_interest.lower()}.",
                "days": itinerary_days,
                "budget_breakdown": breakdown,
                "travel_tips": self._get_best_tips(destination_name)
            }
        }
