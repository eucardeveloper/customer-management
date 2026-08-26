CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT,
    product_name VARCHAR(255),
    price NUMERIC(19,2),
    quantity INTEGER,
    date TIMESTAMP,
    status VARCHAR(50)
);