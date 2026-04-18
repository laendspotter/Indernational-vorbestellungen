-- ============================================================
-- Indernational v1.6 – Supabase Migration
-- Ausführen im Supabase SQL Editor
-- ============================================================

-- vorbestellungen: neue Spalten
ALTER TABLE vorbestellungen ADD COLUMN IF NOT EXISTS anzahl integer DEFAULT 1;
ALTER TABLE vorbestellungen ADD COLUMN IF NOT EXISTS zeitslot_uhrzeit text;
ALTER TABLE vorbestellungen ADD COLUMN IF NOT EXISTS zeitslot_datum date;
ALTER TABLE vorbestellungen ADD COLUMN IF NOT EXISTS vorbereitet boolean DEFAULT false;
ALTER TABLE vorbestellungen ADD COLUMN IF NOT EXISTS variante text;

-- menus: Freitags-Varianten
ALTER TABLE menus ADD COLUMN IF NOT EXISTS fr_menu1_var1 text DEFAULT '';
ALTER TABLE menus ADD COLUMN IF NOT EXISTS fr_menu1_var2 text DEFAULT '';
ALTER TABLE menus ADD COLUMN IF NOT EXISTS fr_menu2_var1 text DEFAULT '';
ALTER TABLE menus ADD COLUMN IF NOT EXISTS fr_menu2_var2 text DEFAULT '';

-- admin_announcements (Popup Manager)
CREATE TABLE IF NOT EXISTS admin_announcements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titel text DEFAULT '',
  text text NOT NULL,
  icon text DEFAULT '📢',
  aktiv boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ankuendigungen (Startseiten-Banner)
CREATE TABLE IF NOT EXISTS ankuendigungen (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  text text NOT NULL,
  typ text DEFAULT 'info',
  aktiv boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- einstellungen: gesperrte Wochentage
ALTER TABLE einstellungen ADD COLUMN IF NOT EXISTS gesperrte_wochentage text DEFAULT '[]';

-- loyalty_reset_log
CREATE TABLE IF NOT EXISTS loyalty_reset_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  typ text DEFAULT '14tage',
  created_at timestamptz DEFAULT now()
);

-- loyalty_log (Transaktionen)
CREATE TABLE IF NOT EXISTS loyalty_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  delta integer NOT NULL DEFAULT 0,
  grund text DEFAULT '',
  admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- loyalty_regeln
CREATE TABLE IF NOT EXISTS loyalty_regeln (
  id integer PRIMARY KEY DEFAULT 1,
  punkte_menu1 integer DEFAULT 10,
  punkte_menu2 integer DEFAULT 10,
  geburtstags_multiplikator numeric DEFAULT 2,
  punkte_pro_euro integer DEFAULT 100,
  max_einloesen integer DEFAULT 500,
  ablauf_tage integer DEFAULT 0
);
INSERT INTO loyalty_regeln (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- global_einstellungen
CREATE TABLE IF NOT EXISTS global_einstellungen (
  id integer PRIMARY KEY DEFAULT 1,
  truck_aktiv boolean DEFAULT true,
  kantine_aktiv boolean DEFAULT true,
  loyalty_aktiv boolean DEFAULT true,
  global_gesperrt boolean DEFAULT false,
  kontakt_email text DEFAULT '',
  impressum text DEFAULT ''
);
INSERT INTO global_einstellungen (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- admin_log (falls noch nicht vorhanden)
CREATE TABLE IF NOT EXISTS admin_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  typ text DEFAULT 'truck',
  aktion text NOT NULL,
  details text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- profiles (falls noch nicht vorhanden)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  created_at timestamptz DEFAULT now()
);

-- RLS für neue Tabellen aktivieren
ALTER TABLE admin_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ankuendigungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_reset_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_regeln ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_einstellungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_log ENABLE ROW LEVEL SECURITY;

-- öffentliche Leserechte für Ankündigungen und Popups
CREATE POLICY IF NOT EXISTS "Ankündigungen öffentlich lesbar" ON ankuendigungen FOR SELECT USING (aktiv = true);
CREATE POLICY IF NOT EXISTS "Popups öffentlich lesbar" ON admin_announcements FOR SELECT USING (aktiv = true);
CREATE POLICY IF NOT EXISTS "Loyalty Regeln lesbar" ON loyalty_regeln FOR SELECT USING (true);

-- Service Role hat vollen Zugriff (via API)
