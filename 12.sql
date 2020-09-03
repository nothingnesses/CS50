-- write a SQL query to list the titles of all movies in which both Johnny Depp and Helena Bonham Carter starred.
SELECT DISTINCT title
FROM (
  SELECT movie_id
  AS table_a,
  COUNT(*)
  FROM stars
  JOIN people
  ON stars.person_id = people.id
  WHERE name
  IN (
    'Johnny Depp',
    'Helena Bonham Carter'
  )
  GROUP BY movie_id
  HAVING COUNT(*) = 2
)
JOIN movies
ON table_a = movies.id;