#!/bin/bash
# Builds the single-file game. Usage: bash src/build.sh [output.html]   (default: ../index.html)
set -e
D="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$D/../index.html}" D="$D" python3 - <<'PY'
import os
d=os.environ['D']+'/'
head=open(d+'head.html').read().rstrip()
assert head.endswith('<script>')
js=''.join(open(d+'js/'+f).read()+'\n' for f in ['util.js','phys.js','data.js','demfar.js','dem.js','trees.js','hole.js','paint.js','gl.js','gl2.js','tree3d.js','game1.js','game2.js','game3.js','game4.js','game5.js','game6.js','game7.js','game8.js','game9.js','game10.js','game11.js'])
js=js.replace("if(typeof module!=='undefined')module.exports=","if(false)module.exports=")
out=head+'\n'+js+'</script>\n</body>\n</html>\n'
open(os.environ['OUT'],'w').write(out)
print('built',os.environ['OUT'],len(out))
PY
