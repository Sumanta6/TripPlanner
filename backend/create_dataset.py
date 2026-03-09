import json
import os

def create_dataset():
    data = {
        "destinations": [
            {
                "name": "Kathmandu Valley",
                "categories": ["Culture", "History", "Relaxation"],
                "activities": [
                    {"title": "Pashupatinath Temple Visit", "time_of_day": "Morning", "category": "Culture", "cost_tier": ["budget", "standard", "luxury"], "duration_hours": 3},
                    {"title": "Boudhanath Stupa Exploration", "time_of_day": "Afternoon", "category": "Culture", "cost_tier": ["budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Durbar Square Heritage Walk", "time_of_day": "Morning", "category": "History", "cost_tier": ["budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Thamel Evening Stroll & Dinner", "time_of_day": "Evening", "category": "Relaxation", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 3},
                    {"title": "Swayambhunath (Monkey Temple) Hike", "time_of_day": "Afternoon", "category": "Culture", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2}
                ],
                "tips": "Carry small changes for entry fees. Dress modestly when visiting temples.",
                "accommodation": ["budget guesthouse", "3-star hotel", "5-star luxury hotel"]
            },
            {
                "name": "Pokhara",
                "categories": ["Adventure", "Nature", "Relaxation"],
                "activities": [
                    {"title": "Sarangkot Sunrise View", "time_of_day": "Morning", "category": "Nature", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 3},
                    {"title": "Phewa Lake Boating", "time_of_day": "Afternoon", "category": "Relaxation", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Paragliding", "time_of_day": "Morning", "category": "Adventure", "cost_tier": ["standard", "luxury"], "duration_hours": 3},
                    {"title": "World Peace Pagoda Hike", "time_of_day": "Afternoon", "category": "Nature", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Lakeside Evening Walk & Live Music", "time_of_day": "Evening", "category": "Relaxation", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 3}
                ],
                "tips": "October-November is the best time for clear mountain views. Book paragliding a day in advance.",
                "accommodation": ["lakeside hostel", "boutique hotel", "luxury resort"]
            },
            {
                "name": "Chitwan National Park",
                "categories": ["Wildlife", "Nature"],
                "activities": [
                    {"title": "Jungle Safari (Jeep)", "time_of_day": "Morning", "category": "Wildlife", "cost_tier": ["budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Canoe Ride on Rapti River", "time_of_day": "Afternoon", "category": "Nature", "cost_tier": ["budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Elephant Breeding Center Visit", "time_of_day": "Morning", "category": "Wildlife", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Tharu Cultural Dance Show", "time_of_day": "Evening", "category": "Culture", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Jungle Walk with Guide", "time_of_day": "Morning", "category": "Wildlife", "cost_tier": ["backpacking", "budget", "standard"], "duration_hours": 3}
                ],
                "tips": "Wear earthy colors during safaris to avoid startling wildlife. Carry insect repellent.",
                "accommodation": ["jungle lodge", "eco resort", "premium wildlife lodge"]
            },
            {
                "name": "Lumbini",
                "categories": ["Culture", "History", "Religious"],
                "activities": [
                    {"title": "Maya Devi Temple Visit", "time_of_day": "Morning", "category": "Religious", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Explore International Monastic Zone", "time_of_day": "Afternoon", "category": "Culture", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Meditation Session", "time_of_day": "Morning", "category": "Relaxation", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "World Peace Pagoda Walk", "time_of_day": "Evening", "category": "History", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2}
                ],
                "tips": "Maintain silence in meditation zones. Rent a bicycle to explore the large monastic area.",
                "accommodation": ["budget guesthouse", "standard hotel", "luxury wellness resort"]
            },
            {
                "name": "Everest Base Camp",
                "categories": ["Trekking", "Adventure", "Nature"],
                "activities": [
                    {"title": "Morning Trek to Namche Bazaar", "time_of_day": "Morning", "category": "Trekking", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 6},
                    {"title": "Acclimatization Hike to Everest View Hotel", "time_of_day": "Morning", "category": "Trekking", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Trek to Tengboche Monastery", "time_of_day": "Afternoon", "category": "Culture", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 5},
                    {"title": "Final Push to Base Camp", "time_of_day": "Morning", "category": "Adventure", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 8},
                    {"title": "Rest & Hot Tea at Teahouse", "time_of_day": "Evening", "category": "Relaxation", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 3}
                ],
                "tips": "Acclimatize properly—never rush. Drink 3-4 liters of water daily.",
                "accommodation": ["basic teahouse", "premium lodge"]
            },
            {
                "name": "Annapurna Base Camp",
                "categories": ["Trekking", "Adventure", "Nature"],
                "activities": [
                    {"title": "Trek through Rhododendron Forests", "time_of_day": "Morning", "category": "Nature", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 5},
                    {"title": "Hot Springs at Jhinu Danda", "time_of_day": "Afternoon", "category": "Relaxation", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Sunrise at ABC", "time_of_day": "Morning", "category": "Nature", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Trek to Machhapuchhre Base Camp", "time_of_day": "Afternoon", "category": "Trekking", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Evening View of Annapurna South", "time_of_day": "Evening", "category": "Nature", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2}
                ],
                "tips": "Bring crampons in winter. Enjoy the natural hot springs to soothe muscles.",
                "accommodation": ["teahouse"]
            },
            {
                "name": "Langtang",
                "categories": ["Trekking", "Nature", "Culture"],
                "activities": [
                    {"title": "Trek up Langtang Valley", "time_of_day": "Morning", "category": "Trekking", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 6},
                    {"title": "Visit Kyanjin Gompa", "time_of_day": "Afternoon", "category": "Culture", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Yak Cheese Factory Tour", "time_of_day": "Afternoon", "category": "Culture", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 1},
                    {"title": "Hike to Kyanjin Ri", "time_of_day": "Morning", "category": "Adventure", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Evening Tea with Local Tamang Family", "time_of_day": "Evening", "category": "Relaxation", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2}
                ],
                "tips": "Try the local yak cheese! The trek is rich in Tamang culture.",
                "accommodation": ["teahouse"]
            },
            {
                "name": "Mustang",
                "categories": ["Adventure", "Culture", "Nature"],
                "activities": [
                    {"title": "Drive/Trek to Jomsom", "time_of_day": "Morning", "category": "Adventure", "cost_tier": ["budget", "standard", "luxury"], "duration_hours": 5},
                    {"title": "Explore Kagbeni Village", "time_of_day": "Afternoon", "category": "Culture", "cost_tier": ["budget", "standard", "luxury"], "duration_hours": 3},
                    {"title": "Visit Muktinath Temple", "time_of_day": "Morning", "category": "Religious", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Apple Orchard Tour in Marpha", "time_of_day": "Afternoon", "category": "Relaxation", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Evening Stroll in Lo Manthang", "time_of_day": "Evening", "category": "Culture", "cost_tier": ["standard", "luxury"], "duration_hours": 2}
                ],
                "tips": "Winds pick up heavily in the afternoon (Jomsom). Try the famous Marpha apple brandy.",
                "accommodation": ["guesthouse", "boutique lodge", "luxury resort"]
            },
            {
                "name": "Rara Lake",
                "categories": ["Nature", "Relaxation", "Adventure"],
                "activities": [
                    {"title": "Hike through Rara National Park", "time_of_day": "Morning", "category": "Nature", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Boating on Rara Lake", "time_of_day": "Afternoon", "category": "Relaxation", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Murma Top Viewpoint Hike", "time_of_day": "Morning", "category": "Adventure", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 5},
                    {"title": "Bird Watching", "time_of_day": "Afternoon", "category": "Wildlife", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 3},
                    {"title": "Camping by the Lake", "time_of_day": "Evening", "category": "Relaxation", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 4}
                ],
                "tips": "It's a remote region; carry necessary medicines and supplies. Nights get very cold.",
                "accommodation": ["tent camp", "basic guesthouse", "boutique lodge"]
            },
            {
                "name": "Manaslu Circuit",
                "categories": ["Trekking", "Adventure", "Culture"],
                "activities": [
                    {"title": "Trek to Maccha Khola", "time_of_day": "Morning", "category": "Trekking", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 6},
                    {"title": "Cross Larkya La Pass", "time_of_day": "Morning", "category": "Adventure", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 8},
                    {"title": "Visit Lho Monastery", "time_of_day": "Afternoon", "category": "Culture", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Rest in Samagaun", "time_of_day": "Afternoon", "category": "Relaxation", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Evening Acclimatization Walk", "time_of_day": "Evening", "category": "Trekking", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 1}
                ],
                "tips": "A restricted area permit and registered guide are mandatory.",
                "accommodation": ["teahouse"]
            },
            {
                "name": "Upper Mustang",
                "categories": ["Adventure", "Culture", "History"],
                "activities": [
                    {"title": "Explore Lo Manthang City Walls", "time_of_day": "Morning", "category": "History", "cost_tier": ["budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Visit Chhoser Cave Dwellings", "time_of_day": "Afternoon", "category": "Adventure", "cost_tier": ["budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Pony Ride to Namgyal Gompa", "time_of_day": "Morning", "category": "Culture", "cost_tier": ["standard", "luxury"], "duration_hours": 3},
                    {"title": "Trek through the Red Cliffs", "time_of_day": "Afternoon", "category": "Nature", "cost_tier": ["budget", "standard", "luxury"], "duration_hours": 5},
                    {"title": "Evening Tibetan Tea Ceremony", "time_of_day": "Evening", "category": "Relaxation", "cost_tier": ["budget", "standard", "luxury"], "duration_hours": 2}
                ],
                "tips": "Requires a special expensive restricted area permit ($500). Very arid desert-like terrain.",
                "accommodation": ["guesthouse", "boutique lodge"]
            },
            {
                "name": "Ghorepani Poon Hill",
                "categories": ["Trekking", "Nature", "Relaxation"],
                "activities": [
                    {"title": "Hike up the Stone Steps to Ulleri", "time_of_day": "Morning", "category": "Trekking", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 5},
                    {"title": "Walk through Rhododendron Forest", "time_of_day": "Afternoon", "category": "Nature", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 4},
                    {"title": "Early Morning Hike to Poon Hill Sunrise", "time_of_day": "Morning", "category": "Adventure", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 2},
                    {"title": "Descend to Ghandruk Village", "time_of_day": "Afternoon", "category": "Culture", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 5},
                    {"title": "Relaxing Evening in Teahouse", "time_of_day": "Evening", "category": "Relaxation", "cost_tier": ["backpacking", "budget", "standard", "luxury"], "duration_hours": 3}
                ],
                "tips": "A great short, beginner-friendly trek. Crowds are common in peak season.",
                "accommodation": ["teahouse"]
            }
        ]
    }
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, 'ai_engine', 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    with open(os.path.join(data_dir, 'destinations.json'), 'w') as f:
        json.dump(data, f, indent=4)
        
    print(f"Created {os.path.join(data_dir, 'destinations.json')}")

    rules = {
        "budget_multipliers": {
            "backpacking": {"accommodation": 0.30, "food": 0.30, "transport": 0.30, "activities": 0.10},
            "budget":      {"accommodation": 0.35, "food": 0.30, "transport": 0.20, "activities": 0.15},
            "standard":    {"accommodation": 0.40, "food": 0.25, "transport": 0.15, "activities": 0.20},
            "luxury":      {"accommodation": 0.55, "food": 0.20, "transport": 0.10, "activities": 0.15}
        }
    }
    with open(os.path.join(data_dir, 'rules.json'), 'w') as f:
        json.dump(rules, f, indent=4)
        
    print(f"Created {os.path.join(data_dir, 'rules.json')}")

if __name__ == "__main__":
    create_dataset()
