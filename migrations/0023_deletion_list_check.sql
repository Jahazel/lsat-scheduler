CREATE FUNCTION is_on_deletion_list(listed_account uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT FROM deletion_list WHERE account_id = listed_account);
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION is_on_deletion_list(uuid) FROM PUBLIC;
