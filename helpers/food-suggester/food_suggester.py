import sys
import requests
import json
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv("C:/projects/mezon/mezon-uni-pal/.env")

def resolveLocationName(user_input):
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""
        Bạn là chuyên gia về địa điểm tại Việt Nam, đặc biệt là các trường đại học.
        Người dùng nhập: "{user_input}"
        Hãy trả về TÊN CHÍNH THỨC của địa điểm (ví dụ: tên đầy đủ của trường đại học) nếu đó là một tên viết tắt, biệt danh, hoặc tên không chính xác.
        Nếu không xác định được, trả về: "Không xác định được địa điểm."
        Chỉ trả về tên địa điểm chính thức hoặc thông báo lỗi, không giải thích thêm.
        """

        response = model.generate_content(prompt)
        return response.text.strip()

    except Exception as e:
        print(f"[Gemini ERROR] {e}")
        return "Oops, something went wrong."


def getNearbyFoodPlaces(location_name):
    try:
        # Resolve location name using Gemini API
        resolved_location = resolveLocationName(location_name)
        if resolved_location == "Không xác định được địa điểm.":
            return f"❌ Không xác định được địa điểm từ '{location_name}'. Vui lòng thử lại với tên cụ thể hơn."
        if resolved_location == "Oops, something went wrong.":
            return resolved_location

        # Geocode the resolved location using Nominatim
        nominatim_url = f"https://nominatim.openstreetmap.org/search?q={resolved_location}&format=json&limit=1"
        headers = {"User-Agent": "UniPalBot/1.0 (duyhuu1109@gmail.com)"}
        geo_resp = requests.get(nominatim_url, headers=headers, timeout=10)
        geo_resp.raise_for_status()
        geo_data = geo_resp.json()

        if not geo_data:
            return f"❌ Không tìm thấy vị trí cho '{resolved_location}'. Vui lòng thử lại."

        lat, lng = float(geo_data[0]["lat"]), float(geo_data[0]["lon"])

        # Search nearby restaurants using Google Maps Places API
        places_url = "https://google-map-places-new-v2.p.rapidapi.com/v1/places:searchNearby"
        rapidapi_key = os.getenv("RAPIDAPI_KEY")
        if not rapidapi_key:
            return "❌ Lỗi: Không tìm thấy API key trong .env. Vui lòng kiểm tra file .env."

        body = {
            "languageCode": "vi",
            "includedTypes": ["restaurant"],
            "excludedTypes": [],
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": 1000
                }
            },
            "maxResultCount": 20
        }
        headers = {
            "X-RapidAPI-Key": rapidapi_key,
            "X-RapidAPI-Host": "google-map-places-new-v2.p.rapidapi.com",
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.priceLevel"
        }

        response = requests.post(places_url, headers=headers, json=body, timeout=10)
        response.raise_for_status()
        data = response.json()

        restaurants = data.get("places", [])
        if not restaurants:
            return f"❌ Không tìm thấy quán ăn nào gần '{resolved_location}'."

        filtered = [
            r for r in restaurants
            if r.get("rating", 0) >= 4.4
            and r.get("priceLevel", 0) in [0, 1]
        ]

        if not filtered:
            return f"❌ Không tìm thấy quán ăn giá rẻ và đánh giá cao gần '{resolved_location}'."

        message = f"🍜 Gợi ý quán ăn giá rẻ và đánh giá cao gần {resolved_location}:\n\n"
        for idx, place in enumerate(filtered, 1):
            name = place.get("displayName", {}).get("text", "Không rõ tên")
            address = place.get("formattedAddress", "Không rõ địa chỉ")
            rating = place.get("rating", "N/A")
            message += f"{idx}. {name} - ⭐ {rating}\n📍 {address}\n\n"

        return message.strip()
    except requests.exceptions.RequestException as e:
        return f"❌ Lỗi API: {str(e)}"
    except Exception as e:
        return f"❌ Lỗi: {str(e)}"

if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")

    if len(sys.argv) < 2:
        print("❌ Vui lòng cung cấp địa điểm.", flush=True)
        sys.exit(1)

    location = sys.argv[1]
    print(getNearbyFoodPlaces(location), flush=True)