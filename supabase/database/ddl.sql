create or replace view v_user_profile_with_exercise_days as
select distinct
  p.id,
  p.username,
  date(el.timestamp AT TIME ZONE 'Asia/Tokyo') as exercise_date
from
  profiles p
  left join exercise_logs el on p.id = el.user_id
order by
  exercise_date desc;
