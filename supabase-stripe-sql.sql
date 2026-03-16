-- Preise zu vorbestellungen hinzufügen
alter table vorbestellungen
  add column if not exists preis numeric(6,2),
  add column if not exists getraenk text default '',
  add column if not exists getraenk_preis numeric(5,2) default 0,
  add column if not exists zahlung text default 'bar',  -- 'bar' oder 'online'
  add column if not exists bezahlt boolean default false,
  add column if not exists stripe_session_id text default '';

-- Preise zu menus hinzufügen
alter table menus
  add column if not exists mo_menu1_preis numeric(6,2) default 0,
  add column if not exists mo_menu2_preis numeric(6,2) default 0,
  add column if not exists di_menu1_preis numeric(6,2) default 0,
  add column if not exists di_menu2_preis numeric(6,2) default 0,
  add column if not exists mi_menu1_preis numeric(6,2) default 0,
  add column if not exists mi_menu2_preis numeric(6,2) default 0,
  add column if not exists do_menu1_preis numeric(6,2) default 0,
  add column if not exists do_menu2_preis numeric(6,2) default 0,
  add column if not exists fr_menu1_preis numeric(6,2) default 0,
  add column if not exists fr_menu2_preis numeric(6,2) default 0;

-- Getränke Tabelle
create table if not exists getraenke (
  id uuid default gen_random_uuid() primary key,
  typ text not null,        -- 'truck' oder 'kantine'
  name text not null,
  preis numeric(5,2) not null,
  verfuegbar boolean default true,
  reihenfolge int default 0,
  created_at timestamptz default now()
);

alter table getraenke enable row level security;
create policy "getraenke_select" on getraenke for select using (true);
create policy "getraenke_insert" on getraenke for insert with check (true);
create policy "getraenke_update" on getraenke for update using (true);
create policy "getraenke_delete" on getraenke for delete using (true);

-- Standard-Getränke einfügen
insert into getraenke (typ, name, preis, reihenfolge) values
  ('truck', 'Cola', 2.20, 1),
  ('truck', 'Fanta', 2.20, 2),
  ('truck', 'Sprite', 2.20, 3),
  ('truck', 'Mezzo Mix', 2.20, 4),
  ('truck', 'Wasser', 1.20, 5),
  ('kantine', 'Cola', 2.20, 1),
  ('kantine', 'Fanta', 2.20, 2),
  ('kantine', 'Sprite', 2.20, 3),
  ('kantine', 'Mezzo Mix', 2.20, 4),
  ('kantine', 'Wasser', 1.20, 5);
