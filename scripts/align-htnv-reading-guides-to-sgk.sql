-- Align each public reading guide with the 2018 curriculum's Kết nối tri thức
-- textbook selection. Do not copy textbook pages into the pinned literary text.
-- Safe to rerun: both the scope prefix and publisher link are deduplicated.
WITH editions(text_key, scope, publisher_url) AS (
  VALUES
  ('vo-nhat', 'Ngữ văn 11, tập một – Kết nối tri thức, trang 12–22.', 'https://taphuan.nxbgd.vn/tap-huan/chi-tiet-sach/ngu-van-11-tap-mot-939696849.939696849'),
  ('chi-pheo', 'Ngữ văn 11, tập một – Kết nối tri thức, trang 23–35.', 'https://taphuan.nxbgd.vn/tap-huan/chi-tiet-sach/ngu-van-11-tap-mot-939696849.939696849'),
  ('xuan-toc-do-cuu-quoc', 'Ngữ văn 12, tập một – Kết nối tri thức, trang 11–18.', 'https://taphuan.nxbgd.vn/tap-huan/chi-tiet-sach/ngu-van-12-tap-mot-940003905.940003905'),
  ('mua-la-rung-trong-vuon', 'Ngữ văn 12, tập một – Kết nối tri thức, trang 19–25.', 'https://taphuan.nxbgd.vn/tap-huan/chi-tiet-sach/ngu-van-12-tap-mot-940003905.940003905')
)
UPDATE assignments a
SET prediction_template = jsonb_set(
      jsonb_set(
        a.prediction_template,
        '{readingGuide}',
        to_jsonb(regexp_replace(CASE
          WHEN left(a.prediction_template->>'readingGuide', length(e.scope)) = e.scope
          THEN a.prediction_template->>'readingGuide'
          ELSE e.scope || E'\n\n' || btrim(a.prediction_template->>'readingGuide')
        END, E'\n{3,}', E'\n\n', 'g')), true
      ),
      '{readingSources}',
      CASE
        WHEN coalesce(a.prediction_template->'readingSources', '[]'::jsonb)
             @> jsonb_build_array(jsonb_build_object('label', 'Sách giáo khoa trên trang Nhà xuất bản Giáo dục Việt Nam', 'url', e.publisher_url))
        THEN a.prediction_template->'readingSources'
        ELSE jsonb_build_array(jsonb_build_object('label', 'Sách giáo khoa trên trang Nhà xuất bản Giáo dục Việt Nam', 'url', e.publisher_url))
          || coalesce(a.prediction_template->'readingSources', '[]'::jsonb)
      END, true
    ),
    updated_at = now()
FROM literature_texts t JOIN editions e ON e.text_key=t.public_id
WHERE a.text_id=t.id
  AND a.public_id LIKE 'htnv-%-2026'
  AND a.prediction_template ? 'readingGuide';
