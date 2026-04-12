-- ============================================================
-- PACFGM Quest — Migració inicial de base de dades
-- Fitxer: db/migrations/001_schema.sql
-- Executar: mysql -u USER -p pacfgm_quest < 001_schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ============================================================
-- Taula: usuaris
-- ============================================================
CREATE TABLE IF NOT EXISTS usuaris (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  nom             VARCHAR(100) NOT NULL,
  alias           VARCHAR(50)  UNIQUE NOT NULL,
  email           VARCHAR(150) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  rol             ENUM('alumne', 'monitor') DEFAULT 'alumne',
  xp_total        INT DEFAULT 0,
  xp_setmana      INT DEFAULT 0,         -- reseteja cada dilluns
  nivell          INT DEFAULT 1,
  rang            ENUM('novici','aprenent','guerrer','campió','mestre') DEFAULT 'novici',
  racha_dies      INT DEFAULT 0,
  ultima_sessio   DATE,
  actiu           BOOLEAN DEFAULT TRUE,
  creat_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualitzat_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Taula: progres_nodes
-- ============================================================
CREATE TABLE IF NOT EXISTS progres_nodes (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  usuari_id         INT NOT NULL,
  node_id           VARCHAR(100) NOT NULL,
  estat             ENUM('bloquejat','disponible','completat','dominat') DEFAULT 'bloquejat',
  intents           INT DEFAULT 0,
  millor_puntuacio  INT DEFAULT 0,         -- 0 a 100
  xp_acumulat       INT DEFAULT 0,         -- XP obtingut en aquest node
  completat_at      TIMESTAMP NULL,
  creat_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualitzat_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
  UNIQUE KEY uq_usuari_node (usuari_id, node_id)
);

-- ============================================================
-- Taula: sessions_estudi
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions_estudi (
  id                    INT PRIMARY KEY AUTO_INCREMENT,
  usuari_id             INT NOT NULL,
  node_id               VARCHAR(100) NOT NULL,
  preguntes_totals      INT DEFAULT 5,
  preguntes_correctes   INT DEFAULT 0,
  puntuacio             INT DEFAULT 0,    -- 0 a 100
  superat               BOOLEAN DEFAULT FALSE,
  xp_guanyat            INT DEFAULT 0,
  durada_segons         INT,
  completada            BOOLEAN DEFAULT FALSE,
  creat_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE
);

-- ============================================================
-- Taula: preguntes_log
-- ============================================================
CREATE TABLE IF NOT EXISTS preguntes_log (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  sessio_id           INT NOT NULL,
  numero_pregunta     INT NOT NULL,       -- 1 a 5
  pregunta_text       TEXT,
  opcions             JSON,               -- array de 4 opcions
  resposta_correcta   VARCHAR(1),         -- A, B, C o D
  resposta_alumne     VARCHAR(1),         -- A, B, C, D o NULL (no va respondre)
  correcte            BOOLEAN,
  temps_resposta_ms   INT,
  creat_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sessio_id) REFERENCES sessions_estudi(id) ON DELETE CASCADE
);

-- ============================================================
-- Taula: side_quests
-- ============================================================
CREATE TABLE IF NOT EXISTS side_quests (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  usuari_id     INT NOT NULL,
  tipus         ENUM('repas_rapid','materia_aleatoria','repas_general','boss_challenge','racha_rescue'),
  descripcio    VARCHAR(255),
  node_id       VARCHAR(100),             -- pot ser NULL per quests generals
  xp_bonus      INT DEFAULT 0,
  completada    BOOLEAN DEFAULT FALSE,
  data_quest    DATE NOT NULL,            -- la data per la qual és vàlida
  completada_at TIMESTAMP NULL,
  creat_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
  UNIQUE KEY uq_usuari_data (usuari_id, data_quest)
);

-- ============================================================
-- Taula: xp_log (historial de XP per auditoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS xp_log (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  usuari_id   INT NOT NULL,
  xp_delta    INT NOT NULL,              -- positiu sempre (no restem XP)
  motiu       VARCHAR(100),             -- 'sessio_completada', 'side_quest', 'racha_bonus'
  referencia  INT,                      -- id de la sessió o side quest
  creat_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE
);

-- ============================================================
-- Dades inicials: nodes disponibles per defecte
-- S'executen per a cada nou usuari quan es registra
-- Gestionat per codi (Node.js), no per SQL directe
-- ============================================================

-- ============================================================
-- Índexs per a rendiment
-- ============================================================
CREATE INDEX idx_progres_usuari ON progres_nodes(usuari_id);
CREATE INDEX idx_sessions_usuari ON sessions_estudi(usuari_id);
CREATE INDEX idx_sessions_node ON sessions_estudi(node_id);
CREATE INDEX idx_xp_log_usuari ON xp_log(usuari_id);
CREATE INDEX idx_usuaris_xp_setmana ON usuaris(xp_setmana DESC);
