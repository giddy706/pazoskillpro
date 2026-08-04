-- Courses had a schema default of rating 5.0, so every course appeared to have a
-- perfect rating even though no ratings had been given. Reset them to 0 (unrated).
UPDATE courses SET rating = 0 WHERE rating = 5;
