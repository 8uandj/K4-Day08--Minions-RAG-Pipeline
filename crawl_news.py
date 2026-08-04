import os
# pyrefly: ignore [missing-import]
import trafilatura

URLS = [
    {
        "filename": "news_01_hagiang_travel.txt",
        "url": "https://vnexpress.net/cam-nang-du-lich-ha-giang-4445788.html"
    },
    {
        "filename": "news_02_nhatrang_travel.txt",
        "url": "https://www.ivivu.com/blog/2015/04/du-lich-nha-trang-cam-nang-tu-a-den-z-cap-nhat-42015/"
    },
    {
        "filename": "news_03_danang_travel.txt",
        "url": "https://www.traveloka.com/vi-vn/explore/destination/du-lich-da-nang-3-ngay-2-dem/145822?clickref=1101lDGdVCbU&utm_id=SIUSDi5h&campaign_id=1101l6470&partner_id=1101l345763&adref=6a6b2a68e20f016916483113&gad_source=1"
    },
    {
        "filename": "news_04_dalat_travel.txt",
        "url": "https://www.ivivu.com/blog/2013/09/du-lich-da-lat-cam-nang-tu-a-den-z/"
    },
    {
        "filename": "news_05_hanoi_travel.txt",
        "url": "https://vnexpress.net/cam-nang-du-lich-ha-noi-4459188.html"
    }
]

# Đường dẫn lưu dữ liệu theo chuẩn đề bài
OUTPUT_DIR = os.path.join("data", "landing", "news")

def crawl_news_data():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("🚀 Bắt đầu crawl 5 bài viết du lịch...")
    
    for item in URLS:
        url = item["url"]
        file_path = os.path.join(OUTPUT_DIR, item["filename"])
        print(f"📥 Đang tải: {url}")
        
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            text = trafilatura.extract(downloaded)
            if text:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(text)
                print(f"   ✅ Đã lưu: {file_path}")
            else:
                print(f"   ❌ Lỗi trích xuất text từ: {url}")
        else:
            print(f"   ❌ Lỗi tải trang: {url}")

if __name__ == "__main__":
    crawl_news_data()