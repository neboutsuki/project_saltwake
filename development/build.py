from pathlib import Path
import sys
base=Path(sys.argv[1]);out=Path(sys.argv[2]);s=base.read_text();patch=Path(__file__).with_name('unseen-live.js').read_text()
def change(a,b):
 global s
 assert s.count(a)==1,(a[:100],s.count(a));s=s.replace(a,b)
# Use native AI pathfinding, combat and drops, never spawn parallel actors.
change('const def=COMBAT_PARTS[e.type]||{},human=this.actorFaction(e)', '''if(e.war?.state==='retreat'&&window.saltwakeWar&&this.mapId==='quays'){e.instinctAttack=null;if(window.saltwakeWar.move(this,e,dt,true))continue;}
   const def=COMBAT_PARTS[e.type]||{},human=this.actorFaction(e)''')
change("e.instinctAttack=null;if(e.awareness==='suspicious')continue;\n    const radius=", "e.instinctAttack=null;if(e.awareness==='suspicious')continue;\n    if(e.war&&window.saltwakeWar&&this.mapId==='quays'){if(e.war.state==='ambush')continue;if(window.saltwakeWar.move(this,e,dt))continue;}\n    const radius=")
# UI labels preserve other data, save key and compatibility.
change('</body></html>','<script>'+patch+'</script></body></html>')
change('v0.29.1 · Living Coast Alpha','v0.30.0-alpha.1 · The Unseen War')
# Document title and visible release label, not content or save version.
import re
s=re.sub(r'<title>[^<]*</title>','<title>ASHEN WILDS: SALTWAKE — The Unseen War | v0.30.0-alpha.1</title>',s,count=1)
out.write_text(s)
