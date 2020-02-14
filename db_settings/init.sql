CREATE TABLE public."Project" (
  pro_id SERIAL PRIMARY KEY,
  pro_name text NOT NULL,
  pro_pw text NOT NULL
);

INSERT INTO public."Project" (pro_name, pro_pw)
VALUES  ('輔大資管系', 'aaa123'');