import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

volksai_dir = r"C:\Users\Asus\Desktop\Tender_Volks\TMS\tms\volksAi"
if volksai_dir not in sys.path:
    sys.path.insert(0, volksai_dir)

from dotenv import dotenv_values
env_path = os.path.join(volksai_dir, ".env")
env_vals = dotenv_values(env_path)

api_key = env_vals.get("ANTHROPIC_API_KEY")
role1_model = env_vals.get("ANTHROPIC_ROLE1_MODEL") or env_vals.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
role2_model = env_vals.get("ANTHROPIC_ROLE2_MODEL") or env_vals.get("ANTHROPIC_MODEL", "claude-sonnet-5-5")

if not api_key:
    print("ERROR: ANTHROPIC_API_KEY not found in volksAi/.env")
    sys.exit(1)

import anthropic

try:
    client = anthropic.Anthropic(api_key=api_key)
    response = client.models.list()
    model_ids = [m.id for m in response.data]
    print("Available model IDs:")
    for mid in sorted(model_ids):
        print(f"  - {mid}")
    
    print(f"\nConfigured ANTHROPIC_ROLE1_MODEL: {role1_model}")
    print(f"  In model list: {role1_model in model_ids}")

    print(f"\nConfigured ANTHROPIC_ROLE2_MODEL: {role2_model}")
    print(f"  In model list: {role2_model in model_ids}")

except Exception as e:
    # Do not leak key
    print(f"Error calling client.models.list(): {type(e).__name__}: {e}")
