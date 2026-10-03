-- Học tốt Ngữ Văn — KHKT 2026-2027 clean academic seed
-- Prerequisite: schema is migrated and these accounts already exist:
--   giaovien@cvt.edu.vn, hocsinh1@cvt.edu.vn, hocsinh2@cvt.edu.vn
-- This seed NEVER embeds credentials and NEVER creates submitted versions/results.
-- Manual AI flow: operator copies a ChatGPT response into the AI account; when sent,
-- feedback is immediately visible to the student. Official rubric remains teacher-only.

BEGIN;
SELECT set_config('app.class_member_write','admin',true);

INSERT INTO classes(code,name,school_year,created_by)
SELECT '11A1-KHKT','11A1 – Hồ sơ đọc số KHKT','2026-2027',id
FROM app_users WHERE lower(email)='giaovien@cvt.edu.vn'
ON CONFLICT(code) DO UPDATE SET name=EXCLUDED.name,school_year=EXCLUDED.school_year,updated_at=now();

INSERT INTO class_members(class_id,user_id,member_role)
SELECT c.id,u.id,'teacher' FROM classes c JOIN app_users u ON lower(u.email)='giaovien@cvt.edu.vn'
WHERE c.code='11A1-KHKT'
ON CONFLICT(class_id,user_id) DO UPDATE SET member_role='teacher';

INSERT INTO class_members(class_id,user_id,member_role)
SELECT c.id,u.id,'student' FROM classes c JOIN app_users u ON lower(u.email) IN ('hocsinh1@cvt.edu.vn','hocsinh2@cvt.edu.vn')
WHERE c.code='11A1-KHKT'
ON CONFLICT(class_id,user_id) DO UPDATE SET member_role='student';

INSERT INTO rubrics(public_id,title,description,created_by,is_active)
SELECT 'rubric-poetics-6-axis-2026','Rubric hồ sơ đọc số theo 6 trục thi pháp',
       'Rubric 4 mức. Điểm chính thức do giáo viên xác nhận và máy chủ tính từ rubric gắn với assignment.',id,true
FROM app_users WHERE lower(email)='giaovien@cvt.edu.vn'
ON CONFLICT(public_id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,is_active=true,updated_at=now();

WITH levels AS (
  SELECT '[{"level":1,"label":"Chưa đạt","score":1,"description":"Nhận diện/phân tích còn sơ lược hoặc thiếu căn cứ văn bản."},{"level":2,"label":"Đạt","score":2,"description":"Xác định đúng yếu tố chính và có giải thích cơ bản."},{"level":3,"label":"Khá","score":3,"description":"Phân tích mạch lạc chức năng nghệ thuật, có dẫn chứng và liên kết luận điểm."},{"level":4,"label":"Xuất sắc","score":4,"description":"Đánh giá sâu, khái quát thuyết phục và thể hiện tư duy độc lập."}]'::jsonb AS j
), criteria(public_id,axis_id,title,sort_order) AS (
  VALUES
    ('crit-plot','plot_situation','Tình huống – Cốt truyện',1),
    ('crit-char','character_detail','Nhân vật – Chi tiết nghệ thuật',2),
    ('crit-pov','narrator_pov','Người kể chuyện – Điểm nhìn',3),
    ('crit-space','space_time','Không gian – Thời gian nghệ thuật',4),
    ('crit-lang','language_tone_symbol','Ngôn ngữ – Giọng điệu – Biểu tượng',5),
    ('crit-synth','form_argument','Tổng hợp – Lập luận',6)
)
INSERT INTO rubric_criteria(rubric_id,public_id,axis_id,title,weight,levels_json,sort_order)
SELECT r.id,c.public_id,c.axis_id,c.title,1,l.j,c.sort_order
FROM rubrics r CROSS JOIN criteria c CROSS JOIN levels l
WHERE r.public_id='rubric-poetics-6-axis-2026'
ON CONFLICT(rubric_id,public_id) DO UPDATE SET axis_id=EXCLUDED.axis_id,title=EXCLUDED.title,weight=EXCLUDED.weight,levels_json=EXCLUDED.levels_json,sort_order=EXCLUDED.sort_order;

WITH teacher AS (SELECT id FROM app_users WHERE lower(email)='giaovien@cvt.edu.vn' LIMIT 1),
texts(public_id,title,author,year_text,genre,synopsis,historical_context,tags) AS (
  VALUES
  ('vo-nhat','Vợ nhặt','Kim Lân','1954','Truyện ngắn hiện thực',
   'Hồ sơ đọc tập trung vào nghịch lí một gia đình mới hình thành giữa nạn đói, qua đó khảo sát tình người, khát vọng sống và sự thay đổi của nhân vật.',
   'Bối cảnh nạn đói năm 1945; ngữ liệu đầy đủ do giáo viên quản lí riêng.',ARRAY['tình huống','nhân vật','nạn đói 1945','khát vọng sống']::text[]),
  ('chi-pheo','Chí Phèo','Nam Cao','1941','Truyện ngắn hiện thực phê phán',
   'Hồ sơ đọc tập trung vào quá trình tha hóa, thức tỉnh và bi kịch bị cự tuyệt quyền trở lại cộng đồng của nhân vật trung tâm.',
   'Bối cảnh nông thôn Việt Nam trước 1945; ngữ liệu đầy đủ do giáo viên quản lí riêng.',ARRAY['tha hóa','thức tỉnh','định kiến','điểm nhìn']::text[]),
  ('xuan-toc-do-cuu-quoc','Xuân Tóc Đỏ cứu quốc','Vũ Trọng Phụng','1936','Tiểu thuyết trào phúng – đoạn trích',
   'Hồ sơ đọc khảo sát nghịch lí giữa thực chất và sự tung hô, cơ chế tạo hình ảnh người hùng và nghệ thuật trào phúng.',
   'Bối cảnh xã hội thành thị trước 1945; ngữ liệu đầy đủ do giáo viên quản lí riêng.',ARRAY['trào phúng','nghịch lí','đám đông','thực chất-danh hiệu']::text[]),
  ('mua-la-rung-trong-vuon','Mùa lá rụng trong vườn','Ma Văn Kháng','1985','Tiểu thuyết',
   'Hồ sơ đọc tập trung vào biến động gia đình, xung đột giá trị giữa các thế hệ và khả năng gìn giữ những giá trị cốt lõi trong thay đổi xã hội.',
   'Bối cảnh đời sống gia đình Việt Nam trong thời kì chuyển biến; ngữ liệu đầy đủ do giáo viên quản lí riêng.',ARRAY['gia đình','thế hệ','truyền thống-hiện đại','biểu tượng']::text[])
)
INSERT INTO literature_texts(public_id,title,author,year_text,genre,synopsis,excerpt,full_content,historical_context,tags,created_by)
SELECT x.public_id,x.title,x.author,x.year_text,x.genre,x.synopsis,'','',x.historical_context,x.tags,t.id
FROM texts x CROSS JOIN teacher t
ON CONFLICT(public_id) DO UPDATE SET title=EXCLUDED.title,author=EXCLUDED.author,year_text=EXCLUDED.year_text,genre=EXCLUDED.genre,synopsis=EXCLUDED.synopsis,historical_context=EXCLUDED.historical_context,tags=EXCLUDED.tags,updated_at=now();

INSERT INTO literature_text_versions(literature_text_id,version_no,title,author,year_text,genre,synopsis,excerpt,full_content,historical_context,tags,content_checksum,created_by)
SELECT t.id,1,t.title,t.author,t.year_text,t.genre,t.synopsis,t.excerpt,t.full_content,t.historical_context,t.tags,
       encode(digest(t.public_id||'|1|'||t.title||'|'||t.author||'|'||t.synopsis,'sha256'),'hex'),t.created_by
FROM literature_texts t
WHERE t.public_id IN ('vo-nhat','chi-pheo','xuan-toc-do-cuu-quoc','mua-la-rung-trong-vuon')
ON CONFLICT(literature_text_id,version_no) DO NOTHING;

WITH cfg AS (
 SELECT '{"predictionEnabled":true,"aiReviewRequired":true,"aiReviewStages":["initial"],"manualAiResponse":true,"aiFeedbackVisibleImmediately":true,"teacherFollowUpEnabled":true,"reflectionRequired":true,"officialRubricRequired":true}'::jsonb AS j
), data(public_id,text_public_id,title,difficulty,prompt,guiding_steps,ai_guidance,common_mistakes,reference_guide,prediction_template) AS (
 VALUES
 ('11a1-vo-nhat','vo-nhat','Hồ sơ đọc số: Vợ nhặt','Nâng cao',
  'Thực hiện hồ sơ đọc số theo 6 trục thi pháp. Quy trình: V0 → V1 → phản hồi → V2 → REF1 → Rubric giáo viên → FINAL.',
  '["V0: dự đoán từ nhan đề, xung đột, hình ảnh và mức tự tin","V1: đọc và trả lời theo các trục thi pháp","Đọc góp ý AI được gửi trực tiếp cho học sinh","Chỉnh sửa và nộp V2, nêu rõ thay đổi và lí do","Hoàn thành REF1 trước Rubric giáo viên"]'::jsonb,
  'Ở V0 không chấm đúng/sai tuyệt đối. Sau V1, đối chiếu bài với câu hỏi, gợi ý chuyên môn, lỗi thường gặp và rubric; nêu điểm đạt, chỗ cần bổ sung và câu hỏi gợi mở. AI không quyết định điểm cuối.',
  'Kể lại cốt truyện; thiếu quan hệ nhân-quả; phân tích nhân vật tách khỏi hoàn cảnh; dẫn chứng không gắn luận điểm.',
  'Trọng tâm: nghịch lí sự sống/cái chết và hạnh phúc/đói khát; tình huống nhặt vợ làm bộc lộ sự thay đổi của các nhân vật; chú ý vận động từ hiện thực khắc nghiệt tới hi vọng.',
  '{"enabled":true,"requireConfidence":true,"questions":["Dựa vào nhan đề, em dự đoán hoàn cảnh và xung đột trung tâm?","Hình ảnh nào có thể trở thành biểu tượng?","Điều gì làm em tò mò nhất?"]}'::jsonb),
 ('11a1-chi-pheo','chi-pheo','Hồ sơ đọc số: Chí Phèo','Nâng cao',
  'Thực hiện hồ sơ đọc số Chí Phèo theo 6 trục thi pháp, lưu V0/V1/V2 bất biến và hoàn thành REF1 trước Rubric giáo viên.',
  '["V0: dự đoán về nhân vật, xung đột, định kiến và mức tự tin","V1: phân tích theo các trục thi pháp","Nhận góp ý AI để sửa bài","Nộp V2 với lí do thay đổi và phản hồi đã sử dụng","Hoàn thành REF1"]'::jsonb,
  'Không yêu cầu V0 phải đoán đúng bi kịch tha hóa. Sau V1, tập trung chuỗi gặp gỡ – được chăm sóc – thức tỉnh – hi vọng hòa nhập – bị cự tuyệt; xem xét cách điểm nhìn giúp người đọc hiểu nhân vật từ bên trong.',
  'Đồng nhất biểu hiện bạo lực với toàn bộ bản chất; kể sự kiện không phân tích bước ngoặt; nhầm ngôi kể với điểm nhìn; kết luận đạo đức đơn giản.',
  'Trọng tâm: cốt truyện là chuỗi tình huống tạo thức tỉnh và bi kịch; đặt hành vi nhân vật trong quan hệ với định kiến cộng đồng, nhu cầu được thừa nhận và khả năng thay đổi.',
  '{"enabled":true,"requireConfidence":true,"questions":["Từ nhan đề, em dự đoán đây là kiểu số phận nào?","Xung đột có thể diễn ra giữa cá nhân với ai hoặc điều gì?","Một người từng làm điều xấu có còn khả năng thay đổi không?"]}'::jsonb),
 ('11a1-xuan-toc-do','xuan-toc-do-cuu-quoc','Hồ sơ đọc số: Xuân Tóc Đỏ cứu quốc','Nâng cao',
  'Thực hiện hồ sơ đọc số đoạn Xuân Tóc Đỏ cứu quốc, chú ý nghịch lí, trào phúng và khoảng cách giữa thực chất với hình ảnh được xã hội tung hô.',
  '["V0: dự đoán từ cụm từ cứu quốc, nghịch lí nhan đề và hình ảnh trung tâm","V1: phân tích tình huống, nhân vật, đám đông, giọng điệu và biểu tượng","Nhận góp ý AI","Nộp V2 và nêu lí do chỉnh sửa","REF1 rồi Rubric giáo viên"]'::jsonb,
  'Ở V0 chấp nhận nhiều dự đoán nếu có căn cứ; không ép học sinh nhận ra ngay sắc thái mỉa mai. Sau đọc, phân biệt sự thật, cách đám đông nhìn nhận và hiệu quả trào phúng.',
  'Kết luận trước khi phân tích chi tiết; chỉ gọi tên châm biếm mà không giải thích cơ chế; nhầm thành tích được tung hô với giá trị thật.',
  'Trọng tâm: sự đặt cạnh Xuân Tóc Đỏ với cụm từ trang trọng cứu quốc tạo nghịch lí; theo dõi cách đám đông/quyền lực tạo danh hiệu và hình ảnh người hùng.',
  '{"enabled":true,"requireConfidence":true,"questions":["Cứu quốc gợi kiểu hành động hoặc con người nào?","Vì sao nhan đề có thể tạo nghịch lí?","Nhân vật thành người hùng vì tài năng, may mắn, hoàn cảnh hay sự tung hô?"]}'::jsonb),
 ('11a1-mua-la-rung','mua-la-rung-trong-vuon','Hồ sơ đọc số: Mùa lá rụng trong vườn','Chuyên sâu',
  'Thực hiện hồ sơ đọc số theo quy trình V0 → V1 → phản hồi → V2 → REF1 → Rubric giáo viên → FINAL.',
  '["V0: dự đoán từ nhan đề, biểu tượng khu vườn/lá rụng, xung đột giá trị và mức tự tin","V1: đọc theo 6 trục và mạng lưới quan hệ gia đình","Nhận phản hồi AI/giáo viên","V2: sửa có dẫn vết thay đổi","REF1 rồi Rubric"]'::jsonb,
  'Không biến V0 thành bài kiểm tra kiến thức. Sau V1, tập trung sự vận động của gia đình, va đập giữa các thế hệ, biểu tượng và câu hỏi giữ gìn/thay đổi giá trị.',
  'Đồng nhất truyền thống với đúng và hiện đại với sai; chỉ kể mâu thuẫn gia đình; gán biểu tượng cứng nhắc; thiếu liên kết giữa quan hệ nhân vật và biến đổi xã hội.',
  'Trọng tâm: nhan đề gợi vận động thời gian, mất mát, chuyển tiếp và tiếp nối; khu vườn có thể được đọc như không gian gia đình nhiều thế hệ nhưng phải chứng minh bằng chi tiết và lập luận.',
  '{"enabled":true,"requireConfidence":true,"questions":["Nhan đề khiến em dự đoán thay đổi/mất mát nào?","Xung đột trung tâm có thể là gì?","Khu vườn và lá rụng có thể mang ý nghĩa biểu tượng gì?"]}'::jsonb)
)
INSERT INTO assignments(public_id,class_id,text_id,rubric_id,title,assigned_at,deadline,difficulty,target_axes,prompt,guiding_steps,starter_template,status,ai_guidance,common_mistakes,reference_guide,prediction_template,workflow_config,created_by,literature_text_version_id)
SELECT d.public_id,c.id,t.id,r.id,d.title,now(),now()+interval '90 days',d.difficulty,
       ARRAY['plot_situation','character_detail','narrator_pov','space_time','language_tone_symbol','form_argument']::text[],
       d.prompt,d.guiding_steps,'{}'::jsonb,'published',d.ai_guidance,d.common_mistakes,d.reference_guide,d.prediction_template,cfg.j,u.id,v.id
FROM data d
JOIN classes c ON c.code='11A1-KHKT'
JOIN literature_texts t ON t.public_id=d.text_public_id
JOIN literature_text_versions v ON v.literature_text_id=t.id AND v.version_no=1
JOIN rubrics r ON r.public_id='rubric-poetics-6-axis-2026'
JOIN app_users u ON lower(u.email)='giaovien@cvt.edu.vn'
CROSS JOIN cfg
ON CONFLICT(public_id) DO UPDATE SET title=EXCLUDED.title,prompt=EXCLUDED.prompt,guiding_steps=EXCLUDED.guiding_steps,status='published',ai_guidance=EXCLUDED.ai_guidance,common_mistakes=EXCLUDED.common_mistakes,reference_guide=EXCLUDED.reference_guide,prediction_template=EXCLUDED.prediction_template,workflow_config=EXCLUDED.workflow_config,literature_text_version_id=EXCLUDED.literature_text_version_id,rubric_id=EXCLUDED.rubric_id,updated_at=now();

INSERT INTO portfolios(assignment_id,student_id,status,active_version)
SELECT a.id,u.id,'drafting','Nháp'
FROM assignments a JOIN app_users u ON lower(u.email) IN ('hocsinh1@cvt.edu.vn','hocsinh2@cvt.edu.vn')
WHERE a.public_id IN ('11a1-vo-nhat','11a1-chi-pheo','11a1-xuan-toc-do','11a1-mua-la-rung')
ON CONFLICT(assignment_id,student_id) DO NOTHING;

INSERT INTO portfolio_drafts(portfolio_id,content_json,updated_by)
SELECT p.id,jsonb_build_object(
 'plot_situation',jsonb_build_object('axisId','plot_situation','analysisText','','evidenceQuotes','[]'::jsonb),
 'character_detail',jsonb_build_object('axisId','character_detail','analysisText','','evidenceQuotes','[]'::jsonb),
 'narrator_pov',jsonb_build_object('axisId','narrator_pov','analysisText','','evidenceQuotes','[]'::jsonb),
 'space_time',jsonb_build_object('axisId','space_time','analysisText','','evidenceQuotes','[]'::jsonb),
 'language_tone_symbol',jsonb_build_object('axisId','language_tone_symbol','analysisText','','evidenceQuotes','[]'::jsonb),
 'form_argument',jsonb_build_object('axisId','form_argument','analysisText','','evidenceQuotes','[]'::jsonb)
),p.student_id
FROM portfolios p JOIN assignments a ON a.id=p.assignment_id
WHERE a.public_id IN ('11a1-vo-nhat','11a1-chi-pheo','11a1-xuan-toc-do','11a1-mua-la-rung')
ON CONFLICT(portfolio_id) DO NOTHING;

INSERT INTO audit_logs(actor_id,actor_role,action,target_type,target_id,after_json,ip_address)
SELECT u.id,'admin','SEED_KHKT_2026_2027_CLEAN_BASE','system','khkt-2026-2027',
       '{"assignments":4,"manualAiResponse":true,"aiFeedbackVisibleImmediately":true,"workflow":"V0-V1-feedback-V2-REF1-rubric-FINAL"}'::jsonb,'seed'
FROM app_users u WHERE lower(u.email)='admin@cvt.edu.vn'
AND NOT EXISTS(SELECT 1 FROM audit_logs WHERE action='SEED_KHKT_2026_2027_CLEAN_BASE' AND target_id='khkt-2026-2027');

COMMIT;
