-- schema_referrals.sql
-- 1. Add columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

-- 2. Function to generate a random referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    done BOOL;
BEGIN
    done := false;
    WHILE NOT done LOOP
        new_code := upper(substring(md5(random()::text) from 1 for 6));
        LOCK TABLE profiles IN EXCLUSIVE MODE;
        SELECT count(*) = 0 INTO done FROM profiles WHERE referral_code = new_code;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 3. Update existing profiles with referral codes
UPDATE profiles SET referral_code = generate_referral_code() WHERE referral_code IS NULL;

-- 4. Function to handle referral bonus
CREATE OR REPLACE FUNCTION handle_referral_bonus()
RETURNS TRIGGER AS $$
BEGIN
    -- If the new user was referred by someone
    IF NEW.referred_by IS NOT NULL THEN
        -- Add 5,000 IQD to the referrer's balance
        UPDATE profiles
        SET balance = balance + 5000
        WHERE id = NEW.referred_by;
        
        -- Optional: Log this transaction or send a notification
        RAISE NOTICE 'Referral bonus of 5,000 IQD awarded to %', NEW.referred_by;
    END IF;
    
    -- Also ensure the new user has their own referral code
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := generate_referral_code();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger on profile insertion
DROP TRIGGER IF EXISTS on_profile_created_referral ON profiles;
CREATE TRIGGER on_profile_created_referral
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION handle_referral_bonus();

-- 6. Update the handle_new_user function to capture referred_by from metadata
-- Note: This assumes the standard Supabase 'handle_new_user' pattern is used.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, referred_by)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    (new.raw_user_meta_data->>'referred_by')::uuid
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
