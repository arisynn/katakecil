"""Create the Lembar solid SVGs using vector geometry, retaining the supplied silhouettes.
Optional authoring dependencies: fonttools and skia-pathops. Not used by the app/build.
Run from the repository root: python3 scripts/create-lembar-solid.py
"""
from pathlib import Path
import xml.etree.ElementTree as ET
import json
import pathops
from fontTools.svgLib.path import parse_path
from fontTools.pens.svgPathPen import SVGPathPen

ROOT=Path(__file__).resolve().parent.parent/'dist/assets/icons/katakecil-lembar'
CAP=pathops.LineCap.ROUND_CAP
JOIN=pathops.LineJoin.ROUND_JOIN

def path(d):
    p=pathops.Path();parse_path(d,p.getPen());return p

def circle(x,y,rx,ry=None):
    ry=rx if ry is None else ry
    return path(f'M{x-rx} {y}a{rx} {ry} 0 1 0 {rx*2} 0a{rx} {ry} 0 1 0 {-rx*2} 0z')

def shape(node):
    kind=node.tag.rsplit('}',1)[-1];a=node.attrib
    if kind=='path':return path(a['d'])
    if kind in ('circle','ellipse'):
        return circle(float(a['cx']),float(a['cy']),float(a['r'] if kind=='circle' else a['rx']),None if kind=='circle' else float(a['ry']))
    if kind=='rect':
        x,y,w,h=[float(a[k]) for k in ('x','y','width','height')]
        rx=min(float(a.get('rx',a.get('ry',0))),w/2);ry=min(float(a.get('ry',a.get('rx',0))),h/2)
        if not rx or not ry:return path(f'M{x} {y}h{w}v{h}h{-w}z')
        return path(f'M{x+rx} {y}H{x+w-rx}A{rx} {ry} 0 0 1 {x+w} {y+ry}V{y+h-ry}A{rx} {ry} 0 0 1 {x+w-rx} {y+h}H{x+rx}A{rx} {ry} 0 0 1 {x} {y+h-ry}V{y+ry}A{rx} {ry} 0 0 1 {x+rx} {y}z')
    raise ValueError(kind)

def stroke(p,width):
    result=pathops.Path(p);result.stroke(width,CAP,JOIN,4);result.convertConicsToQuads(.01);return result

def union(a,b):return pathops.op(a,b,pathops.PathOp.UNION)
def subtract(a,b):return pathops.op(a,b,pathops.PathOp.DIFFERENCE)
def filled(node,width=1.75):
    p=shape(node)
    if node.tag.endswith('path') and not node.attrib['d'].rstrip().lower().endswith('z'):p=path(node.attrib['d']+'z')
    return union(p,stroke(p,width))
def detail(node,width=1.6):return shape(node) if node.get('fill')=='currentColor' else stroke(shape(node),width)

# Explicit semantic roles: fill the bodies, cut the existing meaningful details,
# keep standalone lines as rounded solid paths. Never blindly fill open SVG paths.
bodies={
 'sun':[0],'moon':[0],'leaf':[0],'paper':[0],'sepia':[0],'palette':[0],
 'book':[0],'bookOpen':[0],'single':[0],'double':[0],'bookmark':[0],
 'quote':[0,1],'notes':[0],'clock':[0],'speaker':[0],'play':[0],
 'pause':[0,1],'sliders':[1,2,3],'grid':[0,1,2,3],'appearance':[0],'device':[0],
 'edit':[0],'trash':[1],'info':[0],'sparkle':[0],'folder':[0],'cloud':[0],
 'globe':[0],'mail':[0],'shield':[0],'lock':[0],'eye':[0],'logout':[0],
}
cuts={'paper':[2],'palette':[1,2,3,4],'book':[1],'bookOpen':[1],
 'double':[1],'notes':[1,2],'clock':[1],'appearance':[1],'edit':[1],
 'trash':[2],'info':[1,2],'globe':[1,2],'mail':[1],'shield':[1],
 'lock':[2],'eye':[1]}

out=ROOT/'solid';out.mkdir(parents=True,exist_ok=True);report=[]
for source in sorted((ROOT/'outline').glob('*.svg')):
    name=source.stem;nodes=list(ET.fromstring(source.read_bytes()));result=pathops.Path()
    if name=='systemTheme':
        result=union(shape(nodes[0]),stroke(shape(nodes[0]),1.75))
        result=subtract(result,path('M12 5a7 7 0 0 0 0 14z'))
    elif name=='search':
        result=subtract(union(shape(nodes[0]),stroke(shape(nodes[0]),1.75)),circle(10.5,10.5,4.4))
        result=union(result,stroke(shape(nodes[1]),2.6))
    elif name=='eyeOff':
        eye=list(ET.fromstring((ROOT/'outline/eye.svg').read_bytes()))
        result=subtract(filled(eye[0]),shape(eye[1]))
        slash=shape(nodes[2]);result=subtract(result,stroke(slash,4.2));result=union(result,stroke(slash,2.5))
    else:
        primary=set(bodies.get(name,[]));negative=set(cuts.get(name,[]))
        for i,node in enumerate(nodes):
            if i in negative:continue
            if i in primary:paint=filled(node,2.1 if name in ('quote','play','pause') else 1.75)
            elif node.get('fill')=='currentColor':paint=union(shape(node),stroke(shape(node),.8 if name=='more' else .4))
            else:paint=stroke(shape(node),2.2 if name in ('sepia','speaker','trash') else 2.6)
            result=union(result,paint)
        for i in negative:result=subtract(result,detail(nodes[i],1.8 if name=='shield' else 1.6))
        if name=='leaf':result=subtract(result,stroke(path('M7.2 16.8L14 10'),1.6))
    bounds=result.bounds
    assert all(0<=value<=24 for value in bounds),(name,bounds)
    assert abs(result.area)>0,name
    pen=SVGPathPen(None,ntos=lambda value:format(round(value,3),'g'));result.draw(pen)
    data=pen.getCommands()
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="none">\n  <path d="{data}"/>\n</svg>\n'
    (out/source.name).write_text(svg)
    report.append({'name':name,'bounds':[round(n,3) for n in bounds],'area':round(abs(result.area),3)})
assert len(report)==52
print(json.dumps({'solidIcons':len(report),'allInsideViewBox':True,'report':report},indent=2))
