-- Add original prose summaries to the eight assigned reading guides.
-- Preserve existing guide questions and sources; never present summaries as the
-- textbook's verbatim text. Safe to rerun using the section heading as a marker.
WITH summaries(text_key, content) AS (
  VALUES
  ('vo-nhat', $vn$TÓM LƯỢC NỘI DUNG ĐOẠN HỌC (DIỄN GIẢI)
Giữa nạn đói năm 1945, Tràng, một người kéo xe nghèo ở xóm ngụ cư, bất ngờ đưa một người phụ nữ về nhà làm vợ. Người trong xóm vừa ngạc nhiên vừa lo lắng: giữa lúc người ta khó giữ nổi mạng sống, một gia đình lại có thêm người ăn. Câu chuyện lùi về những lần Tràng gặp người phụ nữ ấy. Từ lời bông đùa và một bữa ăn, chị quyết theo Tràng; cuộc hôn nhân không có nghi lễ trang trọng, cũng không có bảo đảm cho ngày mai.
Trên đường về, Tràng có niềm vui xen với sự ngượng ngập; người vợ mới dè dặt trước ánh nhìn của xóm. Bà cụ Tứ lúc đầu không hiểu chuyện, rồi nhận ra con trai mình đã có vợ. Bà thương con, thương người đàn bà xa lạ và nghĩ đến cái đói đang vây quanh, nhưng vẫn đón nhận nàng dâu, khơi lên chuyện làm ăn và tương lai. Sáng hôm sau, ngôi nhà được dọn dẹp; Tràng cảm thấy mình gắn bó hơn với gia đình, còn người vợ thể hiện vẻ chăm chỉ, thu vén. Bữa cơm ngày đói nghèo đến xót xa, song mọi người cố giữ niềm hi vọng. Câu chuyện về những người đi phá kho thóc và hình ảnh lá cờ ở cuối truyện mở ra một hướng nghĩ khác cho Tràng. Khi đọc, cần giữ đồng thời hai mặt của truyện: hiểm họa chết đói rất thật và mong muốn sống, thương yêu, dựng một mái ấm.$vn$),
  ('chi-pheo', $cp$TÓM LƯỢC NỘI DUNG ĐOẠN HỌC (DIỄN GIẢI)
Truyện mở bằng tiếng chửi của Chí Phèo trên đường làng, nhưng không ai đáp lại. Từ một anh canh điền từng muốn sống bằng lao động, Chí bị đẩy vào tù; khi trở về làng Vũ Đại, anh mang một diện mạo khác và dần sống bằng rượu, những lần gây sự, làm tay sai cho Bá Kiến. Người làng sợ và xa lánh Chí, còn kẻ có quyền biết khai thác sự liều lĩnh ấy. Cách kể đan xen hiện tại với quá khứ để người đọc hiểu quá trình một con người bị tước mất chỗ đứng trong cộng đồng.
Cuộc gặp Thị Nở tạo bước ngoặt. Sau cơn ốm, Chí nghe lại những âm thanh bình thường của đời sống và cảm nhận sự chăm sóc qua bát cháo hành. Anh nhớ một cuộc sống lương thiện, muốn được chung sống với Thị và được người khác chấp nhận. Song bà cô Thị Nở phản đối, Thị cự tuyệt; cánh cửa trở lại cộng đồng khép lại đúng khi Chí ý thức rõ nhất điều mình mong muốn. Chí tìm đến Bá Kiến, đòi quyền được làm người lương thiện, rồi giết Bá Kiến và tự kết thúc cuộc đời. Hình ảnh lò gạch cũ trở lại ở cuối truyện đặt ra câu hỏi về vòng lặp của bất công. Bát cháo hành, tiếng chửi và kết cấu đầu cuối phải được đọc trong quan hệ giữa lòng thương, định kiến và quyền lực, không tách thành các biểu tượng có sẵn.$cp$),
  ('xuan-toc-do-cuu-quoc', $xd$TÓM LƯỢC NỘI DUNG ĐOẠN HỌC (DIỄN GIẢI)
Đoạn trích từ Số đỏ dựng một cuộc thi quần vợt có sự hiện diện của giới cầm quyền và nhiều khán giả. Hai tay vợt được trông đợi không xuất hiện, khiến Xuân Tóc Đỏ được đưa vào trận gặp nhà vô địch Xiêm La. Một sự cố thể thao nhanh chóng bị biến thành việc liên quan đến thể diện và quan hệ giữa các bên. Xuân thi đấu, rồi phải chấp nhận thua theo sự sắp đặt nhằm tránh một kết quả bị xem là bất lợi về ngoại giao.
Điều đáng chú ý là thất bại trên sân lại được giải thích trước đám đông như một sự hi sinh vì quốc gia. Xuân tận dụng hoàn cảnh, dùng lời lẽ hùng hồn để tự nâng tầm hành động của mình, còn công chúng và những người có vị thế góp phần tạo nên danh tiếng cho anh ta. Tiếng cười của đoạn trích nảy sinh từ khoảng cách giữa sự việc người đọc chứng kiến và danh nghĩa cao cả được gán cho nó. Khi phân tích, cần phân biệt trình tự diễn biến trận đấu, động cơ của những người điều khiển sự kiện và phản ứng của đám đông; chỉ ra cách ngôn ngữ trang trọng bị dùng để che lấp sự lố bịch.$xd$),
  ('mua-la-rung-trong-vuon', $ml$TÓM LƯỢC NỘI DUNG ĐOẠN HỌC (DIỄN GIẢI)
Đoạn trích trong tiểu thuyết của Ma Văn Kháng diễn ra khi gia đình ông Bằng chuẩn bị đón giao thừa. Chị Hoài, người con dâu cũ vẫn còn nặng tình với gia đình, bất ngờ trở về thăm nhà trong chiều cuối năm. Cuộc gặp giữa chị với ông Bằng và những người thân gợi lại mối gắn bó không bị cắt đứt bởi sự thay đổi hoàn cảnh. Niềm vui đoàn tụ đi cùng xúc động, nhớ thương và những điều khó nói thành lời.
Không khí chuẩn bị Tết, ngôi nhà và nghi thức sum họp làm nổi bật ý nghĩa của nếp nhà: tình cảm được duy trì qua sự quan tâm, ứng xử và ký ức chung, chứ không chỉ qua quan hệ trên danh nghĩa. Phía sau cuộc gặp là những biến động của gia đình và đời sống, khiến người đọc thấy sự bền chặt của tình thân cũng cần được gìn giữ khi các thế hệ đổi khác. Đoạn học tập trung vào cuộc trở về của chị Hoài và cảm xúc của gia đình ông Bằng; không nên lấy các sự kiện ngoài đoạn trích của toàn bộ tiểu thuyết làm chi tiết đã xuất hiện trên trang sách.$ml$)
)
UPDATE assignments a
SET prediction_template = jsonb_set(
  a.prediction_template, '{readingGuide}',
  to_jsonb(btrim(a.prediction_template->>'readingGuide') || E'\n\n' || s.content),
  true
), updated_at = now()
FROM literature_texts t JOIN summaries s ON s.text_key=t.public_id
WHERE a.text_id=t.id
  AND a.public_id LIKE 'htnv-%-2026'
  AND a.prediction_template ? 'readingGuide'
  AND position('TÓM LƯỢC NỘI DUNG ĐOẠN HỌC (DIỄN GIẢI)' IN a.prediction_template->>'readingGuide') = 0;
