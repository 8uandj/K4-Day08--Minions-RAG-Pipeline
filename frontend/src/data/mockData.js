export const SUGGESTED_TOPICS = [
  {
    id: "hagiang",
    icon: "🏍️",
    title: "Lịch trình Hà Giang 3N2Đ",
    subtitle: "Phượt xe máy Cột Cờ Lũng Cú & Mã Pí Lèng",
    query: "Lập cho tôi lịch trình Hà Giang 3 ngày 2 đêm đi bằng xe máy chi tiết, chú ý an toàn và các điểm check-in đẹp nhất."
  },
  {
    id: "quynhon",
    icon: "🍲",
    title: "Đặc sản Quy Nhơn & Địa chỉ",
    subtitle: "Bánh hỏi lòng heo, chả cá, hải sản tươi",
    query: "Tổng hợp danh sách các món ăn đặc sản Quy Nhơn kèm địa chỉ chuẩn vị local và khoảng giá."
  },
  {
    id: "danang",
    icon: "🏖️",
    title: "Du lịch Đà Nẵng tự túc",
    subtitle: "Kinh nghiệm Bà Nà Hills, Bán đảo Sơn Trà",
    query: "Cho tôi kinh nghiệm du lịch Đà Nẵng tự túc 4N3Đ tiết kiệm chi phí cho gia đình 4 người."
  },
  {
    id: "dalat",
    icon: "☕",
    title: "Mẹo tiết kiệm chi phí Đà Lạt",
    subtitle: "Quán cafe view đẹp, homestay xinh giá rẻ",
    query: "Bí quyết đi Đà Lạt 3N2Đ tiết kiệm chi phí nhưng vẫn check-in đủ quán cafe đẹp và săn mây."
  }
];

export const INITIAL_CONVERSATIONS = [
  {
    id: "conv-1",
    title: "Lịch trình Hà Giang 3N2Đ bằng xe máy",
    date: "Hôm nay",
    preview: "Ngày 1: TP Hà Giang - Cổng Trời Quản Bạ - Yên Minh..."
  },
  {
    id: "conv-2",
    title: "Top 10 món ngon Quy Nhơn phải thử",
    date: "Hôm qua",
    preview: "Bánh hỏi lòng heo Mẫn, Chả giò tôm đất..."
  },
  {
    id: "conv-3",
    title: "Kinh nghiệm săn mây Đà Lạt 2026",
    date: "3 ngày trước",
    preview: "Đồi Đa Phú, Cầu Đất Tea Hill mở cửa từ 4h30 sáng..."
  }
];

export const SAMPLE_CHAT_MESSAGES = [
  {
    id: "msg-1",
    sender: "user",
    timestamp: "10:14 AM",
    content: "Lập cho tôi lịch trình Hà Giang 3 ngày 2 đêm đi bằng xe máy chi tiết, chú ý an toàn đường đèo và dự trù chi phí."
  },
  {
    id: "msg-2",
    sender: "assistant",
    timestamp: "10:15 AM",
    content: `Chào bạn! Hà Giang là cung đường phượt quyến rũ bậc nhất Việt Nam với những con đèo hùng vĩ như **Mã Pí Lèng**, **Cổng Trời Quản Bạ** và sắc hoa tam giác mạch rực rỡ.

Dựa trên dữ liệu cẩm nang du lịch Hà Giang và dự báo thời tiết mới nhất, tôi đã tổng hợp **Lịch trình Hà Giang 3N2Đ bằng xe máy tối ưu & an toàn** dành cho bạn:`,
    citations: [
      {
        id: "cit-1",
        title: "Cẩm Nang Du Lịch An Toàn Hà Giang 2026",
        source: "Sở Du Lịch Hà Giang - Legal & Official Guide",
        snippet: "Đoạn đèo Mã Pí Lèng có nhiều cua gấp và sương mù ban sáng. Người lái xe máy cần kiểm tra phanh đĩa, lốp xe và duy trì tốc độ dưới 30km/h khi qua khúc cua nguy hiểm.",
        score: "94%",
        url: "https://hagiangtourism.vn/cam-nang-an-toan",
        type: "official"
      },
      {
        id: "cit-2",
        title: "Kinh nghiệm Phượt Hà Giang bằng Xe Máy Tự Túc",
        source: "VnExpress Travel - News & Experience",
        snippet: "Thời gian đi xe máy đẹp nhất là từ tháng 9 đến tháng 12. Chi phí thuê xe máy dao động từ 150.000đ - 200.000đ/ngày đối với xe số wave/sirius.",
        score: "89%",
        url: "https://vnexpress.net/dulich/ha-giang-phuot-xe-may",
        type: "news"
      },
      {
        id: "cit-3",
        title: "Bản đồ ẩm thực & Homestay Đồng Văn",
        source: "Phượt Đi & Trải Nghiệm Blog",
        snippet: "Homestay tại Đồng Văn nên đặt trước 1 tuần nếu đi dịp cuối tuần. Món thắng cố và bánh tam giác mạch nướng tại chợ phiên Đồng Văn là trải nghiệm không thể bỏ qua.",
        score: "85%",
        url: "https://phuot.vn/ha-giang-homestay-food",
        type: "blog"
      }
    ],
    itinerary: [
      {
        day: "Ngày 1",
        title: "TP. Hà Giang ➔ Cổng Trời Quản Bạ ➔ Yên Minh (Nghỉ đêm)",
        distance: "100 km",
        activities: [
          { time: "07:30", text: "Thuê xe máy tại trung tâm TP. Hà Giang, kiểm tra phanh và xăng." },
          { time: "09:30", text: "Dừng chân check-in Dốc Bắc Sum & Cổng Trời Quản Bạ." },
          { time: "12:00", text: "Ăn trưa phở tráng tay tại thị trấn Tam Sơn." },
          { time: "15:30", text: "Xuyên rừng thông Yên Minh, check-in hoàng hôn." },
          { time: "19:00", text: "Ăn tối lẩu gà đen H'mông tại trấn Yên Minh." }
        ]
      },
      {
        day: "Ngày 2",
        title: "Yên Minh ➔ Dinh Thự Họ Vương ➔ Cột Cờ Lũng Cú ➔ Đồng Văn",
        distance: "90 km",
        activities: [
          { time: "07:00", text: "Ăn sáng bánh cuốn canh nóng tại Yên Minh." },
          { time: "09:30", text: "Tham quan Dinh Thự Vua H'Mông (Vương Chính Đức)." },
          { time: "12:00", text: "Chinh phục Cột Cờ Lũng Cú - Điểm cực Bắc Tổ Quốc." },
          { time: "16:30", text: "Về Phố Cổ Đồng Văn, nhận phòng Homestay." },
          { time: "19:30", text: "Dạo Chợ đêm Đồng Văn, thưởng thức thắng cố & rượu ngô." }
        ]
      },
      {
        day: "Ngày 3",
        title: "Đồng Văn ➔ Đèo Mã Pí Lèng ➔ Du Thuyền Sông Nho Quế ➔ TP. Hà Giang",
        distance: "150 km",
        activities: [
          { time: "06:30", text: "Thưởng thức cà phê Phố Cổ Đồng Văn ban sương mờ." },
          { time: "08:00", text: "Chinh phục Tứ Đại Đỉnh Đèo Mã Pí Lèng thần thánh." },
          { time: "10:30", text: "Xuống hẻm Tu Sản, chèo thuyền Kayak / du thuyền trên Sông Nho Quế." },
          { time: "13:00", text: "Ăn trưa tại Mèo Vạc và khởi hành chạy vòng về TP. Hà Giang." },
          { time: "18:00", text: "Trả xe máy, nghỉ ngơi lên xe giường nằm về Hà Nội." }
        ]
      }
    ],
    costSummary: [
      { category: "Thuê xe máy & Xăng xe", details: "Xe số Wave Alpha 3 ngày + 120k tiền xăng", cost: "650.000 VNĐ" },
      { category: "Lưu trú (Homestay)", details: "2 đêm tại Yên Minh & Đồng Văn (phòng riêng / dorm)", cost: "500.000 VNĐ" },
      { category: "Ăn uống 3 ngày", details: "Bữa sáng, bữa chính (Lẩu gà đen, lợn tên tên, cháo ẩu tẩu)", cost: "750.000 VNĐ" },
      { category: "Vé tham quan & Sông Nho Quế", details: "Vé Dinh Vua H'mông, Lũng Cú + Thuyền Nho Quế", cost: "250.000 VNĐ" },
      { category: "Tổng Chi Phí Ước Tính", details: "Chi phí trung bình / 1 người (Rất tiết kiệm!)", cost: "2.150.000 VNĐ", isTotal: true }
    ],
    recommendedFoods: [
      {
        name: "Bánh Cuốn Canh Đồng Văn",
        price: "35.000 - 50.000 VNĐ",
        rating: "4.9/5",
        location: "Bánh cuốn Bà Hà - Phố cổ Đồng Văn",
        image: "🍲",
        desc: "Vỏ bánh tráng mỏng dính ôm trọn nhân thịt băm mộc nhĩ, chấm cùng bát nước dùng xương ngọt thanh đậm đà."
      },
      {
        name: "Lẩu Gà Đen H'Mông",
        price: "250.000 - 350.000 VNĐ / nồi",
        rating: "4.8/5",
        location: "Nhà hàng Oanh Hiền - Tam Sơn, Quản Bạ",
        image: "🥘",
        desc: "Thịt gà đen dai ngọt tự nhiên nấu cùng nấm rừng và rau cải đắng cao nguyên lạnh giá."
      },
      {
        name: "Bánh Tam Giác Mạch Nướng",
        price: "15.000 - 20.000 VNĐ / chiếc",
        rating: "4.7/5",
        location: "Các gian hàng quanh Chợ Đồng Văn",
        image: "🥞",
        desc: "Bánh làm từ hạt tam giác mạch thu hoạch sau mùa hoa, nướng than hồng bùi ngậy béo ngậy."
      }
    ]
  }
];
