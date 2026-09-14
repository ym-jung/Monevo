TRUNCATE TABLE fx_rate;

ALTER TABLE fx_rate
    ADD COLUMN as_of DATE NOT NULL;

COMMENT
ON COLUMN fx_rate.rate_date IS '조회 키. 이 날짜의 환율로 쓰겠다고 요청받은 날';
COMMENT
ON COLUMN fx_rate.as_of IS '환율이 실제로 속한 시장 날짜. 주말 요청이면 rate_date보다 뒤일 수 있다';
