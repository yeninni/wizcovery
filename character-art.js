/* Read-only sprite-atlas rendering. The generated original stays unchanged. */
const CharacterArt=(()=>{
  const source='assets/characters/wizmate-walk-atlas.png';
  const directions=['front','right','back','left'];
  let pending;
  function dominantBounds(data,width,height){
    // Locate the character, ignoring isolated transparent-edge specks when aligning.
    const seen=new Uint8Array(width*height),queue=new Int32Array(width*height);
    let largest={count:0,minX:0,minY:0,maxX:width-1,maxY:height-1};
    for(let origin=0;origin<seen.length;origin++){
      if(seen[origin]||data[origin*4+3]<96)continue;
      let first=0,last=1,count=0,minX=width,minY=height,maxX=0,maxY=0;queue[0]=origin;seen[origin]=1;
      while(first<last){const p=queue[first++],x=p%width,y=Math.floor(p/width);count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;const n=ny*width+nx;if(!seen[n]&&data[n*4+3]>=96){seen[n]=1;queue[last++]=n;}}}
      if(count>largest.count)largest={count,minX,minY,maxX,maxY};
    }
    if(!largest.count)throw Error('캐릭터 프레임을 찾지 못했습니다.');
    return largest;
  }
  function renderAtlas(image){
    const cellWidth=image.naturalWidth/4,cellHeight=image.naturalHeight/4,measure=document.createElement('canvas');measure.width=Math.ceil(cellWidth);measure.height=Math.ceil(cellHeight);
    const ctx=measure.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
    const poses=[];
    for(let row=0;row<4;row++)for(let column=0;column<4;column++){
      ctx.clearRect(0,0,measure.width,measure.height);ctx.drawImage(image,column*cellWidth,row*cellHeight,cellWidth,cellHeight,0,0,measure.width,measure.height);
      const data=ctx.getImageData(0,0,measure.width,measure.height).data,bounds=dominantBounds(data,measure.width,measure.height);
      // Head center is a stable anchor even when a stride extends a shoe sideways.
      let min=measure.width,max=0;const headEnd=bounds.minY+Math.round((bounds.maxY-bounds.minY)*.34);
      for(let y=bounds.minY;y<=headEnd;y++)for(let x=bounds.minX;x<=bounds.maxX;x++)if(data[(y*measure.width+x)*4+3]>=128){min=Math.min(min,x);max=Math.max(max,x)}
      poses.push({row,column,bounds,center:(min+max)/2});
    }
    const maxHeight=Math.max(...poses.map(p=>p.bounds.maxY-p.bounds.minY+1)),scale=176/maxHeight;
    const frames=Object.fromEntries(directions.map(d=>[d,[]]));
    for(const pose of poses){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=192;const out=canvas.getContext('2d');out.imageSmoothingEnabled=false;
      // All frames share one scale, head center and sole baseline. No pose stretching.
      const {bounds:b,column,row,center}=pose,left=Math.max(0,b.minX-3),top=Math.max(0,b.minY-3),right=Math.min(measure.width,b.maxX+4),bottom=Math.min(measure.height,b.maxY+3);
      ctx.clearRect(0,0,measure.width,measure.height);ctx.drawImage(image,column*cellWidth,row*cellHeight,cellWidth,cellHeight,0,0,measure.width,measure.height);
      out.drawImage(measure,left,top,right-left,bottom-top,Math.round(64+(left-center)*scale),Math.round(188+(top-b.maxY-1)*scale),(right-left)*scale,(bottom-top)*scale);
      frames[directions[row]].push(canvas.toDataURL('image/png'));
    }
    return {source,frames,width:128,height:192,baseline:188,portrait:frames.front[1],poses:poses.map(p=>({row:p.row,column:p.column,bounds:p.bounds})),scale};
  }
  function load(){if(pending)return pending;pending=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{try{resolve(renderAtlas(image))}catch(e){reject(e)}};image.onerror=()=>reject(Error('캐릭터 원화를 불러올 수 없습니다.'));image.src=source;});return pending;}
  return {load,source};
})();
