-- Menü-Tabelle für Wochenpläne
-- Im Supabase SQL Editor ausführen!

create table menus (
  id uuid default gen_random_uuid() primary key,
  typ text not null,           -- 'truck' oder 'kantine'
  woche_start date not null,   -- immer der Montag der Woche
  mo_menu1 text default '',
  mo_menu2 text default '',
  di_menu1 text default '',
  di_menu2 text default '',
  mi_menu1 text default '',
  mi_menu2 text default '',
  do_menu1 text default '',
  do_menu2 text default '',
  fr_menu1 text default '',
  fr_menu2 text default '',
  updated_at timestamptz default now(),
  unique(typ, woche_start)
);

-- Row Level Security
alter table menus enable row level security;

create policy "Jeder kann Menüs lesen" on menus
  for select using (true);

create policy "Jeder kann Menüs eintragen" on menus
  for insert with check (true);

create policy "Jeder kann Menüs updaten" on menus
  for update using (true);
