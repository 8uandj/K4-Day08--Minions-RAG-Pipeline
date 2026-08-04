export const SUGGESTED_TOPICS = [
  {
    id: "phuquoc",
    icon: "🏝️",
    title: "Du lịch Phú Quốc tự túc",
    subtitle: "Bãi Sao, hòn Thơm, lặn ngắm san hô & hải sản",
    query: "Lập lịch trình du lịch Phú Quốc 3N2Đ tự túc chi tiết, gợi ý các bãi biển đẹp và hải sản ngon."
  },
  {
    id: "evisa",
    icon: "📑",
    title: "Hướng dẫn xin E-Visa Việt Nam",
    subtitle: "Điều kiện xin visa điện tử, thời hạn & phí",
    query: "Cần lưu ý gì về điều kiện xin E-visa và quy định nhập cảnh Việt Nam cho người nước ngoài?"
  },
  {
    id: "hanoi",
    icon: "🍜",
    title: "Ẩm thực Phố cổ Hà Nội",
    subtitle: "Phở gia truyền, bún chả, cà phê trứng",
    query: "Danh sách các món ăn đặc sản Hà Nội nhất định phải thử kèm địa chỉ chuẩn vị local ở Phố Cổ."
  },
  {
    id: "hoian",
    icon: "🏮",
    title: "Khám phá Phố cổ Hội An 2N1Đ",
    subtitle: "Thả đèn hoa đăng, cao lầu, biển An Bàng",
    query: "Gợi ý lịch trình tham quan Hội An 2 ngày 1 đêm, check-in phố cổ và nhà cổ."
  }
];

export const INITIAL_CONVERSATIONS = [
  {
    id: "conv-1",
    title: "Thủ tục xin E-Visa Việt Nam 2026",
    date: "Hôm nay",
    preview: "Thời hạn E-visa 90 ngày, áp dụng cho tất cả quốc gia..."
  },
  {
    id: "conv-2",
    title: "Lịch trình du lịch Phú Quốc 3N2Đ",
    date: "Hôm qua",
    preview: "Bãi Sao, Cáp treo Hòn Thơm, Chợ đêm Dương Đông..."
  },
  {
    id: "conv-3",
    title: "Top 10 món ngon Phố cổ Hà Nội",
    date: "3 ngày trước",
    preview: "Phở Lý Quốc Sư, Bún chả Hàng Quạt, Cà phê trứng Giảng..."
  }
];

export const SAMPLE_CHAT_MESSAGES = [
  {
    id: "msg-1",
    sender: "user",
    timestamp: "10:14 AM",
    content: "Cần lưu ý gì về Visa và E-visa khi nhập cảnh Việt Nam?"
  },
  {
    id: "msg-2",
    sender: "assistant",
    timestamp: "10:15 AM",
    content: `Chào bạn! Dựa trên các văn bản quy định pháp lý du lịch Việt Nam mới nhất từ hệ thống **ChromaDB Vector Store** (Bộ lọc: **Tất cả tài liệu**), tôi xin tổng hợp các quy định nhập cảnh quan trọng:

1. **Điều kiện cấp E-Visa (Visa điện tử):** Tất cả công dân quốc gia/vùng lãnh thổ đều có thể xin E-visa trực tuyến có giá trị lưu trú lên đến **90 ngày** (xuất nhập cảnh đơn lần hoặc nhiều lần).
2. **Thời hạn hộ chiếu:** Hộ chiếu của du khách phải còn hạn ít nhất **6 tháng** kể từ ngày nhập cảnh Việt Nam và còn ít nhất 2 trang trống.
3. **Miễn visa đơn phương:** Du khách từ 13 quốc gia (Đức, Pháp, Ý, Tây Ban Nha, Anh, Nga, Nhật Bản, Hàn Quốc, Đan Mạch, Thụy Điển, Na Uy, Phần Lan, Belarus) được miễn visa tạm trú đến **45 ngày**.`,
    citations: [
      {
        id: "cit-1",
        title: "Quy Định Cấp Visa Điện Tử (E-Visa) Việt Nam",
        source: "vietnam-e-visa-applications.md",
        category: "legal",
        content: "Công dân tất cả các nước có thể nộp đơn xin E-visa trực tuyến qua Cổng thông tin đối ngoại. E-visa có thời hạn tối đa 90 ngày.",
        score: 0.92,
        score_display: "92%",
        url: "https://vietnam.travel/visa-requirements",
        type: "official",
        chunk_id: "chunk_12",
        chunk_size: 512,
        chunk_overlap: 50
      },
      {
        id: "cit-2",
        title: "Yêu Cầu Hộ Chiếu & Miễn Visa Nhập Cảnh",
        source: "vietnam-visa-requirements.md",
        category: "legal",
        content: "Du khách được miễn visa 45 ngày áp dụng cho 13 quốc gia đơn phương. Hộ chiếu cần còn hạn tối thiểu 6 tháng.",
        score: 0.88,
        score_display: "88%",
        url: "https://vietnam.travel/visa-info",
        type: "official",
        chunk_id: "chunk_5",
        chunk_size: 512,
        chunk_overlap: 50
      }
    ]
  }
];
