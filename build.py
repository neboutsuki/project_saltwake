"""Rebuild the self-contained playable HTML from editable source, world and media."""
from pathlib import Path
import base64, json, re, sys
root=Path(__file__).resolve().parent
out=Path(sys.argv[1]) if len(sys.argv)>1 else root/'playable/SALTWAKE_v0.30.0_Unseen_War.html'
s=(root/'source/game.template.html').read_text(encoding='utf-8')
world=(root/'world/world.json').read_text(encoding='utf-8');json.loads(world)
s=s.replace('@@SALTWAKE_WORLD_JSON@@',world)
manifest=json.loads((root/'assets/manifest.json').read_text(encoding='utf-8'))
cache={}
def media(m):
 key=m.group(1)
 if key not in cache:
  a=manifest[key]; cache[key]='data:'+a['mime']+';base64,'+base64.b64encode((root/a['path']).read_bytes()).decode('ascii')
 return cache[key]
# Gameplay modules (source/modules/*.js) are inlined verbatim.
s=re.sub(r'@@SALTWAKE_MODULE:([A-Za-z0-9_.-]+)@@',lambda m:(root/'source/modules'/m.group(1)).read_text(encoding='utf-8').replace('</script','<\\/script'),s)
s=re.sub(r'@@SALTWAKE_MEDIA:([a-z0-9_]+)@@',media,s)
out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(s.encode('utf-8'));print(out)
