import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";

// Load .env.local or .env if present
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

async function seedOwner() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const username = (process.env.OWNER_USERNAME || "gauravsoni").trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
    process.exit(1);
  }

  if (!password) {
    console.error("❌ Missing OWNER_PASSWORD in environment. Please set OWNER_PASSWORD before seeding.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.warn("⚠️ Warning: OWNER_PASSWORD is less than 8 characters. Minimum 8 characters recommended.");
  }

  console.log(`🔑 Seeding owner account for '${username}'...`);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Check if owner exists
  const { data: existingOwners, error: fetchErr } = await supabase
    .from("owners")
    .select("id, username")
    .limit(1);

  if (fetchErr) {
    console.error("❌ Error checking existing owners:", fetchErr.message);
    process.exit(1);
  }

  if (existingOwners && existingOwners.length > 0) {
    const existing = existingOwners[0];
    const { error: updateErr } = await supabase
      .from("owners")
      .update({
        username,
        password_hash: passwordHash,
      })
      .eq("id", existing.id);

    if (updateErr) {
      console.error("❌ Error updating owner:", updateErr.message);
      process.exit(1);
    }
    console.log(`✅ Owner updated successfully: username = '${username}'`);
  } else {
    const { error: insertErr } = await supabase
      .from("owners")
      .insert({
        username,
        password_hash: passwordHash,
      });

    if (insertErr) {
      console.error("❌ Error creating owner:", insertErr.message);
      process.exit(1);
    }
    console.log(`✅ Owner created successfully: username = '${username}'`);
  }

  // Ensure default settings row exists
  const { error: settingsErr } = await supabase
    .from("settings")
    .upsert({ id: 1 }, { onConflict: "id" });

  if (settingsErr) {
    console.warn("⚠️ Note on settings table initialization:", settingsErr.message);
  } else {
    console.log("✅ Settings verified.");
  }

  console.log("🎉 Seeding complete!");
}

seedOwner().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
