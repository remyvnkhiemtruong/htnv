-- Public study notes for the four HTNV works. These are original reading
-- guidance and links; they are not quotations from, or replacements for, the
-- immutable literature revision pinned by the submitted assignments.
-- The client reveals these fields only after V0 has been submitted.
WITH guides(text_key, guide, sources) AS (
  VALUES
  ('vo-nhat', $guide$
Bối cảnh: Nạn đói năm 1945 làm cho việc Tràng đưa một người phụ nữ xa lạ về nhà trở thành một tình huống vừa bất ngờ vừa day dứt. Hãy đọc cả phản ứng của xóm ngụ cư, bà cụ Tứ và chính Tràng; đừng chỉ kể lại chuyện cưới vợ.
1. Tình huống – cốt truyện: Theo dõi từ cuộc gặp, lời mời, lúc đưa người vợ về nhà đến bữa ăn ngày đói. Mỗi bước làm thay đổi tâm thế các nhân vật ra sao?
2. Nhân vật – chi tiết: Đối chiếu Tràng trước và sau khi có gia đình; quan sát sự lo lắng và hi vọng của bà cụ Tứ, sự thay đổi của người vợ nhặt. Chọn một chi tiết cụ thể cho mỗi luận điểm.
3. Người kể – điểm nhìn: Xem người kể dẫn người đọc đến cảm giác của Tràng và bà cụ Tứ bằng cách nào; phân biệt nhận xét của xóm ngụ cư với suy nghĩ bên trong gia đình.
4. Không gian – thời gian: Đặt ngôi nhà mới hình thành giữa xóm đói; chú ý sự chuyển từ chiều đưa vợ về đến buổi sáng hôm sau.
5. Ngôn ngữ – giọng điệu – biểu tượng: Đọc cách nói, cách im lặng, bữa ăn và hình ảnh cuối truyện trong tương quan với sự sống còn và hi vọng.
6. Tổng hợp – lập luận: Nêu một nghịch lí trung tâm, ghép ít nhất hai chi tiết ở các thời điểm khác nhau để chứng minh sự vận động từ đói khát đến mong muốn sống tiếp.
Đây là hướng dẫn đọc, không phải nguyên văn tác phẩm hoặc đáp án cố định. Kiểm chứng từng nhận định và trích dẫn theo bản văn em đọc.
$guide$, jsonb_build_array(
    jsonb_build_object('label','Vợ nhặt – bản đọc tại thư viện giáo dục','url','https://medialib.qlgd.edu.vn/Uploads/THU_VIEN/shn/2/530/UserFiles/vo_nhat__kim_lan.pdf'),
    jsonb_build_object('label','Bài giảng Vợ nhặt – Trường THPT Thủ Đức','url','https://thptthuduc.hcm.edu.vn/mon-van/van-12-bai-vo-nhat-phan-1/ctmb/85902/409529')
  )),
  ('chi-pheo', $guide$
Bối cảnh: Chí Phèo trở về làng Vũ Đại sau thời gian ở tù, bị cộng đồng nhìn bằng định kiến và bị Bá Kiến lợi dụng. Cuộc gặp Thị Nở mở ra khả năng thay đổi nhưng cũng phơi bày rào cản đối với sự trở lại làm người.
1. Tình huống – cốt truyện: Lập chuỗi từ tiếng chửi mở đầu, quá trình tha hóa, cuộc gặp Thị Nở, sự thức tỉnh đến lúc bị cự tuyệt; chỉ ra bước ngoặt của từng chặng.
2. Nhân vật – chi tiết: Đọc Chí trong quan hệ với Bá Kiến, Thị Nở, bà cô Thị Nở và làng Vũ Đại. Chi tiết bát cháo hành có vai trò gì ngoài việc chăm sóc người ốm?
3. Người kể – điểm nhìn: Xem người kể cho người đọc thấy cảm giác và mong muốn của Chí ở những lúc người trong làng chỉ nhìn thấy vẻ ngoài của anh.
4. Không gian – thời gian: Đặt làng Vũ Đại, lò gạch cũ và những ngày sau cuộc gặp Thị Nở vào mạch đời nhân vật; tránh xem không gian chỉ là phông nền.
5. Ngôn ngữ – giọng điệu – biểu tượng: Phân tích tiếng chửi, những cuộc đối thoại và hình ảnh lò gạch cũ theo chức năng trong kết cấu truyện; đối chiếu đầu và cuối.
6. Tổng hợp – lập luận: Tách trách nhiệm của cá nhân, quyền lực địa phương và định kiến cộng đồng. Một chi tiết không đủ để kết luận toàn bộ bản chất nhân vật.
Đây là hướng dẫn đọc, không phải nguyên văn tác phẩm hoặc đáp án cố định. Bản Chí Phèo trên Wikisource giữ cách viết của ấn bản cũ; khi trích dẫn, giữ đúng câu chữ của bản em dùng.
$guide$, jsonb_build_array(
    jsonb_build_object('label','Chí Phèo – văn bản trên Wikisource','url','https://vi.wikisource.org/wiki/Ch%C3%AD_Ph%C3%A8o')
  )),
  ('xuan-toc-do-cuu-quoc', $guide$
Bối cảnh: Đoạn trích từ tiểu thuyết Số đỏ đặt Xuân Tóc Đỏ vào một cuộc thi quần vợt được gắn với danh dự quốc gia. Cần theo dõi khoảng cách giữa diễn biến thực, lời giải thích công khai và sự tung hô của đám đông.
1. Tình huống – cốt truyện: Tách việc chuẩn bị trận đấu, diễn biến trên sân và hệ quả sau trận. Xác định nghịch lí khiến một kết quả thể thao được diễn giải thành công lao lớn.
2. Nhân vật – chi tiết: Đọc hành động của Xuân cùng phản ứng của người có quyền, giới truyền thông và công chúng. Ai tạo ra danh hiệu cho Xuân, vì lợi ích nào?
3. Người kể – điểm nhìn: So sánh điều người đọc nhận ra với cách đám đông nhìn Xuân. Khoảng cách ấy tạo hiệu quả trào phúng ra sao?
4. Không gian – thời gian: Sân quần vợt là nơi biểu diễn trước công chúng; chú ý nhịp sự kiện dồn dập và việc chuyển một cảnh thi đấu thành sự kiện xã hội.
5. Ngôn ngữ – giọng điệu – biểu tượng: Xem các cách gọi trang trọng, lời tán tụng và sự phóng đại đặt cạnh hành động thực tế để tạo giọng mỉa mai.
6. Tổng hợp – lập luận: Phân biệt chiến thắng trên lời nói với điều thực sự xảy ra; dùng các chi tiết ở hai phía của khoảng cách này để chứng minh cơ chế gây cười và ý nghĩa phê phán.
Đây là hướng dẫn đọc, không phải nguyên văn đoạn trích hoặc đáp án cố định. Đối chiếu với đoạn Xuân Tóc Đỏ cứu quốc trong sách giáo khoa hoặc ấn bản Số đỏ em sử dụng.
$guide$, jsonb_build_array(
    jsonb_build_object('label','Số đỏ – thông tin ấn bản Nhà xuất bản Văn học','url','https://books.google.com/books/about/S%E1%BB%91_%C4%91%E1%BB%8F.html?id=z9ff0AEACAAJ')
  )),
  ('mua-la-rung-trong-vuon', $guide$
Bối cảnh: Tiểu thuyết theo dõi một gia đình nhiều thế hệ trước những thay đổi của đời sống. Với đoạn trích học ở lớp, hãy xác định rõ phạm vi văn bản rồi mới liên hệ toàn bộ tiểu thuyết. Cuộc trở về của chị Hoài trong dịp Tết giúp thấy vừa sự gắn bó vừa những rạn nứt.
1. Tình huống – cốt truyện: Xác định ai trở về, ai đón nhận, điều gì được nhắc hoặc bị né tránh. Theo dõi chuyển biến của cuộc sum họp thay vì chỉ liệt kê thành viên.
2. Nhân vật – chi tiết: Đọc chị Hoài, ông Bằng và các thành viên qua hành động, lời nói, phản ứng. Tránh gán người giữ nếp cũ luôn đúng hoặc người muốn đổi thay luôn sai.
3. Người kể – điểm nhìn: Tìm nơi lời kể hướng sự chú ý vào cảm xúc riêng của nhân vật và nơi mở rộng ra quan hệ giữa các thế hệ.
4. Không gian – thời gian: Ngôi nhà, khu vườn và thời khắc cuối năm tạo điều kiện cho nhớ lại, đối chiếu hiện tại với quá khứ.
5. Ngôn ngữ – giọng điệu – biểu tượng: Xem lời đối thoại, sự im lặng và nhan đề lá rụng trong vườn; một biểu tượng có thể gợi mất mát lẫn sự tiếp nối, nhưng phải chứng minh từ đoạn đọc.
6. Tổng hợp – lập luận: Từ một quan hệ gia đình cụ thể, nêu câu hỏi rộng hơn về gìn giữ tình thân khi hoàn cảnh và quan niệm sống thay đổi.
Đây là hướng dẫn đọc, không phải nguyên văn tiểu thuyết hoặc đáp án cố định. Kiểm chứng chi tiết theo đúng đoạn trích hoặc ấn bản em sử dụng.
$guide$, jsonb_build_array(
    jsonb_build_object('label','Mùa lá rụng trong vườn – Nhà xuất bản Kim Đồng','url','https://nxbkimdong.com.vn/mua-la-rung-trong-vuon'),
    jsonb_build_object('label','Giới thiệu tác phẩm – Trường Đại học Khoa học Thái Nguyên','url','https://khcb.tnus.edu.vn/chi-tiet/4729-Tom-tat-tac-pham-Mua-la-rung-trong-vuon-cua-Ma-Van-Khang')
  ))
)
UPDATE assignments a
SET prediction_template = jsonb_set(
      jsonb_set(coalesce(a.prediction_template, '{}'::jsonb), '{readingGuide}', to_jsonb(g.guide), true),
      '{readingSources}', g.sources, true
    ),
    updated_at = now()
FROM literature_texts t JOIN guides g ON g.text_key=t.public_id
WHERE a.text_id=t.id AND a.public_id LIKE 'htnv-%-2026';
