import pandas as pd
import os

def create_template():
    data = [
        {
            "id": "1",
            "name": "Apollo Hospitals, Greams Road",
            "general_beds_available": 6,
            "general_beds_total": 15,
            "icu_beds_available": 3,
            "icu_beds_total": 10,
            "ventilators_available": 1,
            "ventilators_total": 3,
            "oxygen_beds_available": 3,
            "oxygen_beds_total": 6,
            "doctors_on_duty": 14
        },
        {
            "id": "2",
            "name": "Fortis Malar Hospital, Adyar",
            "general_beds_available": 5,
            "general_beds_total": 15,
            "icu_beds_available": 3,
            "icu_beds_total": 10,
            "ventilators_available": 1,
            "ventilators_total": 3,
            "oxygen_beds_available": 3,
            "oxygen_beds_total": 6,
            "doctors_on_duty": 8
        }
    ]
    df = pd.DataFrame(data)
    # Output to backend directory
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    target_path = os.path.join(base_dir, "hospitals_data.xlsx")
    df.to_excel(target_path, index=False)
    print(f"Excel template generated successfully at {target_path}!")

if __name__ == "__main__":
    create_template()
