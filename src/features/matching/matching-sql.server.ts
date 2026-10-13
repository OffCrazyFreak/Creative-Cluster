import { sql } from "drizzle-orm";

import {
  MAX_COLLABORATION_CARDS,
  MIN_SCORE,
  MUTUAL_BONUS,
  TOPIC_WEIGHT,
} from "./matching-constants";

// One statement does the whole match so the request costs a single round trip.
// idf = 1 + ln(N / df): a tag held by every eligible entry weighs 1, a rare one more.
export function matchQuery(entryId: string) {
  const me = sql`${entryId}::uuid`;
  return sql`
    with eligible as (
      select e.id from entry e where e.status = 'published' and not e.matching_opt_out
    ),
    public_tag as (
      select t.id from tag t where t.status = 'active' and t.canonical_id is null
    ),
    total as (select count(*)::float8 as n from eligible),
    idf as (
      select et.tag_id, 1 + ln(total.n / count(distinct et.entry_id)::float8) as w
      from entry_tag et
      join eligible el on el.id = et.entry_id
      join public_tag pt on pt.id = et.tag_id
      cross join total
      group by et.tag_id, total.n
    ),
    mine as (
      select et.tag_id, et.field from entry_tag et
      join public_tag pt on pt.id = et.tag_id
      where et.entry_id = ${me}
    ),
    subject as (
      select
        exists (select 1 from entry where id = ${me} and status = 'published' and not matching_opt_out) as allowed,
        exists (select 1 from mine where field in ('offering', 'seeking')) as has_exchange
    ),
    linked as (
      select case when l.from_id = ${me} then l.to_id else l.from_id end as other_id
      from link l
      where l.status = 'confirmed' and (l.from_id = ${me} or l.to_id = ${me})
    ),
    pairs as (
      select et.entry_id as other_id, et.tag_id, idf.w,
        case
          when mine.field = 'seeking' and et.field = 'offering' then 'offers'
          when mine.field = 'offering' and et.field = 'seeking' then 'seeks'
          else 'topic'
        end as relation
      from mine
      join entry_tag et on et.tag_id = mine.tag_id and et.entry_id <> ${me}
      join eligible el on el.id = et.entry_id
      join idf on idf.tag_id = mine.tag_id
      where (
        (mine.field = 'seeking' and et.field = 'offering')
        or (mine.field = 'offering' and et.field = 'seeking')
        or (mine.field = 'topic' and et.field = 'topic')
      )
      and et.entry_id not in (select other_id from linked)
    ),
    scored as (
      select p.other_id,
        coalesce(sum(p.w) filter (where p.relation = 'offers'), 0) as offers_w,
        coalesce(sum(p.w) filter (where p.relation = 'seeks'), 0) as seeks_w,
        coalesce(sum(p.w) filter (where p.relation = 'topic'), 0) as topic_w,
        jsonb_agg(jsonb_build_object(
          'relation', p.relation, 'slug', t.slug,
          'labelEn', t.label_en, 'labelHr', t.label_hr
        ) order by p.w desc, t.slug) as shared
      from pairs p join tag t on t.id = p.tag_id
      group by p.other_id
    ),
    ranked as (
      select s.*, subject.has_exchange,
        case when subject.has_exchange
          then s.offers_w + s.seeks_w
            + case when s.offers_w > 0 and s.seeks_w > 0 then ${MUTUAL_BONUS}::float8 else 0 end
            + ${TOPIC_WEIGHT}::float8 * s.topic_w
          else s.topic_w
        end as score
      from scored s cross join subject
      where subject.allowed
    )
    select e.id as "entryId", e.slug, e.name, e.kind, e.city,
      e.country_code as "countryCode", e.logo_image_id as "logoImageId",
      r.has_exchange as "hasExchange", r.offers_w as "offersW", r.seeks_w as "seeksW",
      r.score, r.shared
    from ranked r join entry e on e.id = r.other_id
    where case when r.has_exchange
      then (r.offers_w > 0 or r.seeks_w > 0) and r.score >= ${MIN_SCORE}::float8
      else r.topic_w > 0
    end
    order by r.score desc, e.name, e.id
    limit ${MAX_COLLABORATION_CARDS}`;
}
