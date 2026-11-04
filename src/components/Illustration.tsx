import { useId, type ReactNode } from 'react';
import type { AnswerId, Question } from '../data/questions';

const ink = '#56685b';
const wall = '#fbfbf5';
const roof = '#d7e0d2';
const green = '#b2c7a5';
const glazing = '#94b0a5';

function Tree({ x, y, size = 23, plan = false }: { x: number; y: number; size?: number; plan?: boolean }) {
  return <g transform={`translate(${x} ${y})`} stroke={ink} strokeWidth="1.2">
    {!plan && <path d={`M0 ${size * .5}v${size * .85}`} fill="none" />}
    <path d={`M0 ${-size}C${size * .8} ${-size * 1.3} ${size * 1.4} ${-size * .3} ${size * .8} ${size * .2}C${size * 1.1} ${size} ${size * .2} ${size * 1.2} 0 ${size * .7}C${-size * .8} ${size * 1.2} ${-size * 1.3} ${size * .3} ${-size * .8} ${-size * .2}C${-size * 1.1} ${-size * .9} ${-size * .4} ${-size * 1.2} 0 ${-size}Z`} fill={green} />
    {!plan && <path d={`M0 ${size * .65}V${-size * .5}m0 ${size * .7}l${-size * .35} ${-size * .35}m${size * .35} ${size * .1}l${size * .35} ${-size * .35}`} fill="none" opacity=".55" />}
    {plan && <circle cx="0" cy="0" r="2" fill={ink} stroke="none" />}
  </g>;
}

function PlanBuilding({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <g stroke={ink} strokeWidth="1.4">
    <rect x={x} y={y} width={w} height={h} fill={roof} />
    <rect x={x + 5} y={y + 5} width={w - 10} height={h - 10} fill="none" stroke="#9aab92" strokeWidth=".8" />
    <path d={`M${x + w / 2 - 10} ${y + h}h20`} stroke="#f6f7f0" strokeWidth="3" />
  </g>;
}

function TownhomeRow({ homes, x, y, w, h, vertical = false }: { homes: number; x: number; y: number; w: number; h: number; vertical?: boolean }) {
  return <g>{Array.from({ length: homes }, (_, i) => <PlanBuilding key={i}
    x={x + (vertical ? 0 : i * w / homes)} y={y + (vertical ? i * h / homes : 0)}
    w={vertical ? w : w / homes} h={vertical ? h / homes : h} />)}</g>;
}

function Site({ children, neighbors = false, neighborFront = 160 }: { children: ReactNode; neighbors?: boolean; neighborFront?: number }) {
  return <>
    <rect x="84" y="24" width="312" height="205" fill="#e9efdf" stroke="#98a98d" strokeDasharray="4 4" />
    {neighbors && <g opacity=".55">
      <rect x="0" y="24" width="68" height="205" fill="#e9efdf" />
      <rect x="412" y="24" width="68" height="205" fill="#e9efdf" />
      <PlanBuilding x={-8} y={57} w={68} h={neighborFront - 57} />
      <PlanBuilding x={420} y={57} w={68} h={neighborFront - 57} />
    </g>}
    <path d="M0 238H480" stroke="#aebba5" />
    {children}
  </>;
}

/** Oblique building volumes. Every floor has a front, side, and closed roof.
 * Recesses move the front toward a fixed rear wall, exposing real terrace surfaces.
 * The camera and floor height stay constant within every comparison.
 */
function Building({ floors, floorHomes, x = 130, width = 200, bottom = 225, depth = 36, stepback = false, heritage = false, terraces = false, balconies = false }: {
  floors: number; x?: number; width?: number; bottom?: number; depth?: number;
  floorHomes?: number[];
  stepback?: boolean; heritage?: boolean; terraces?: boolean; balconies?: boolean;
}) {
  const floorHeight = 27;
  const projection = .55;
  const recess = (row: number) => (stepback || terraces) && floorHomes ? depth * (1 - floorHomes[row] / 4)
    : 0;
  const columns = Math.max(3, Math.floor(width / 36));
  const spacing = width / (columns + 1);
  const windowWidth = Math.min(16, spacing * .58);

  return <g stroke={ink} strokeWidth="1.2" strokeLinejoin="round">
    {Array.from({ length: floors }, (_, row) => {
      const inset = recess(row);
      const frontX = x + inset;
      const frontY = bottom - (row + 1) * floorHeight - inset * projection;
      const remainingDepth = depth - inset;
      return <g key={row}>
        <path d={`M${frontX + width} ${frontY}l${remainingDepth} ${-remainingDepth * projection}v${floorHeight}l${-remainingDepth} ${remainingDepth * projection}Z`} fill="#dfe6d9" />
        <rect x={frontX} y={frontY} width={width} height={floorHeight} fill={heritage && row < 2 ? '#dec7b3' : wall} />
        <path data-roof="true" d={`M${frontX} ${frontY}l${remainingDepth} ${-remainingDepth * projection}h${width}l${-remainingDepth} ${remainingDepth * projection}Z`} fill={roof} />
        {Array.from({ length: columns }, (_, column) => {
          const windowX = frontX + (column + 1) * spacing - windowWidth / 2;
          // Leave the ground-floor entrance free of windows.
          if (row === 0 && windowX < frontX + width / 2 + 10 && windowX + windowWidth > frontX + width / 2 - 10) return null;
          return <rect key={column} x={windowX} y={frontY + 8} width={windowWidth} height="12" fill={glazing} strokeWidth=".9" />;
        })}
        {remainingDepth >= 18 && <path d={`M${frontX + width + remainingDepth * .3} ${frontY + 8 - remainingDepth * .3 * projection}l${remainingDepth * .4} ${-remainingDepth * .4 * projection}v12l${-remainingDepth * .4} ${remainingDepth * .4 * projection}Z`} fill={glazing} strokeWidth=".9" />}
        {balconies && row > 0 && <g fill="#e2e8dc" strokeWidth="1">
          {[.26, .7].map(position => {
            const bx = frontX + width * position - 20;
            const by = frontY + floorHeight;
            return <g key={position}>
              <path d={`M${bx} ${by}l-7 4h42l7-4Z`} />
              <path d={`M${bx - 7} ${by + 4}v-7h42v7m-28-7v7m14-7v7`} fill="none" />
            </g>;
          })}
        </g>}
      </g>;
    })}
    <rect x={x + width / 2 - 8} y={bottom - 21} width="16" height="21" fill="#809b88" />
    {(stepback || terraces) && Array.from({ length: floors - 1 }, (_, i) => {
      const row = i + 1;
      if (recess(row) === recess(row - 1)) return null;
      const px = x + recess(row - 1);
      const py = bottom - row * floorHeight - recess(row - 1) * projection;
      return <g key={row} strokeWidth=".9">
        <path d={`M${px} ${py}v-7h${width}v7`} fill="none" />
        {[.2, .4, .6, .8].map(position => <path key={position} d={`M${px + width * position} ${py}v-7`} />)}
      </g>;
    })}
    {heritage && <>
      <path d={`M${x - 3} ${bottom - 54}h${width + 6}v-4H${x - 3}Z`} fill="#c4a487" />
      {[.08, .25, .75, .92].map(position => <path key={position} d={`M${x + width * position} ${bottom}v-46`} stroke="#f0e4d6" strokeWidth="4" />)}
    </>}
  </g>;
}

function Streetscape({ children }: { children: ReactNode }) {
  return <>
    <path d="M0 225H480" stroke="#b4c0aa" />
    <g opacity=".45"><Building floors={2} x={-18} width={84} depth={22} /><Building floors={3} x={404} width={84} depth={22} /></g>
    {children}
  </>;
}

function Stairs({ x, y }: { x: number; y: number }) {
  return <g stroke={ink} strokeWidth="1.2" fill="#d0d9c6">
    <rect x={x} y={y} width="40" height="55" />
    {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${x + 5} ${y + 6 + i * 6}h30`} />)}
    <path d={`M${x + 20} ${y + 46}V${y + 10}l-4 6m4-6 4 6`} fill="none" strokeWidth="1.6" />
  </g>;
}

function Bedroom({ x, y, width, height, windowEdge }: { x: number; y: number; width: number; height: number; windowEdge: 'top' | 'left' }) {
  const doorY = y + height - 20;
  return <g data-bedroom="true">
    <rect x={x} y={y} width={width} height={height} fill={wall} />
    <g strokeWidth="1" fill="#e5e9df">
      <rect x={x + width / 2 - 11} y={y + 7} width="22" height="30" rx="1" />
      <rect x={x + width / 2 - 8} y={y + 10} width="16" height="7" rx="1" fill={wall} />
    </g>
    <path d={`M${x + width} ${doorY}v14`} stroke={wall} strokeWidth="3" />
    <path d={`M${x + width} ${doorY}h-14a14 14 0 0 0 14 14`} fill="none" strokeWidth="1" />
    <path d={windowEdge === 'top' ? `M${x + 15} ${y}h${width - 30}` : `M${x} ${y + 12}v${height - 24}`} stroke={glazing} strokeWidth="4" />
  </g>;
}

function PointAccessFloor({ feature }: { feature: boolean }) {
  // Mirror a corner home's bedrooms across the building's two centre lines.
  const corners = ['', 'translate(480 0) scale(-1 1)', 'translate(0 256) scale(1 -1)', 'translate(480 256) scale(-1 -1)'];
  if (feature) return <g stroke={ink} strokeWidth="1.5" strokeLinejoin="round">
    <rect x="90" y="30" width="300" height="196" fill={wall} />
    <path d="M240 30V116M240 141V226" />
    {corners.map(transform => <g key={transform} transform={transform}>
      <Bedroom x={90} y={30} width={75} height={55} windowEdge="top" />
      <path d="M185 30h35M90 48v24" stroke={glazing} strokeWidth="4" />
    </g>)}
    <rect x="150" y="116" width="180" height="25" fill="#e5e9df" />
    {[90, 330].map(x => <g key={x}>
      <rect x={x} y="85" width="60" height="86" fill="#e5e9df" />
      <Stairs x={x + 10} y={100} />
      <path d={`M${x === 90 ? 150 : 330} 121v15`} stroke={wall} strokeWidth="3" />
    </g>)}
    {[190, 275].map(x => <g key={x}>
      <path d={`M${x} 116h16`} stroke={wall} strokeWidth="3" />
      <path d={`M${x} 116v-16a16 16 0 0 1 16 16`} fill="none" strokeWidth="1" />
      <path d={`M${x} 141h16`} stroke={wall} strokeWidth="3" />
      <path d={`M${x} 141v16a16 16 0 0 0 16-16`} fill="none" strokeWidth="1" />
    </g>)}
  </g>;
  return <g stroke={ink} strokeWidth="1.5" strokeLinejoin="round">
    <rect x="90" y="30" width="300" height="196" fill={wall} />
    <path d="M240 30V80M90 128H200M280 128H390M240 176V226" fill="none" />
    {corners.map(transform => <g key={transform} transform={transform}>
      <Bedroom x={90} y={30} width={60} height={49} windowEdge="left" />
      <Bedroom x={90} y={79} width={60} height={49} windowEdge="left" />
      <path d="M165 30h50" stroke={glazing} strokeWidth="4" />
    </g>)}
    <rect x="200" y="80" width="80" height="96" fill="#e5e9df" />
    <Stairs x={220} y={92} />
    {[200, 280].map(x => [107, 146].map(y => <g key={`${x}-${y}`}>
      <path d={`M${x} ${y}v14`} stroke={wall} strokeWidth="3" />
      <path d={`M${x} ${y}h${x === 200 ? -14 : 14}`} fill="none" strokeWidth="1" />
    </g>))}
  </g>;
}

function ApartmentFloor({ kind, feature }: { kind: Question['visualKind']; feature: boolean }) {
  const isWindows = kind === 'windows';
  const rooms: { x: number; y: number; w: number; h: number }[] = isWindows
    ? [
      ...[90, ...(feature ? [] : [190]), 290].map(x => ({ x, y: 30, w: 100, h: 86 })),
      { x: 90, y: 141, w: 300, h: 85 },
    ]
    : [
      { x: 90, y: 30, w: 150, h: 86 }, { x: 240, y: 30, w: 150, h: 86 },
      { x: 90, y: 141, w: 150, h: 85 },
      ...(!feature ? [{ x: 240, y: 141, w: 150, h: 85 }] : []),
    ];
  return <g stroke={ink} strokeWidth="1.5">
    <rect x="90" y="30" width="300" height="196" fill={wall} />
    <rect x="90" y="116" width="300" height="25" fill="#e5e9df" />
    {rooms.map(({ x, y, w, h }) => {
      const upper = y === 30;
      const doorX = x + w / 2 - 7;
      const doorY = upper ? y + h : y;
      return <g key={`${x}-${y}`}>
        <rect x={x} y={y} width={w} height={h} fill={wall} />
        <path d={`M${x + 15} ${upper ? y : y + h}h${w - 30}`} stroke={glazing} strokeWidth={isWindows ? 5 : 3} />
        <path d={`M${doorX} ${doorY}h14`} stroke={wall} strokeWidth="3" />
        <path d={upper ? `M${doorX} ${doorY}v-14a14 14 0 0 1 14 14` : `M${doorX} ${doorY}v14a14 14 0 0 0 14-14`} fill="none" strokeWidth=".9" />
        {kind === 'storage' && <rect x={x + w - 23} y={upper ? 41 : 199} width="15" height="20" fill="#d0d9c6" strokeWidth="1" />}
      </g>;
    })}
    {isWindows && <>
      <path d="M90 47v43m0 78v40m300-161v43m0 78v40" stroke={glazing} strokeWidth="5" />
      {feature && <>
        <rect x="190" y="30" width="100" height="86" fill="#e9efdf" />
        <path d="M191 30h98" stroke="#e9efdf" strokeWidth="3" />
        <text x="240" y="78" fontSize="12" textAnchor="middle" fill={ink} stroke="none">Open court</text>
      </>}
    </>}
    {kind === 'storage' && feature && <>
      <rect x="240" y="141" width="150" height="85" fill="#eff2e9" />
      <path d="M304 141h22" stroke={wall} strokeWidth="3" />
      {Array.from({ length: 8 }, (_, i) => <g key={i}>
        <rect x={251 + i % 4 * 32} y={155 + Math.floor(i / 4) * 32} width="24" height="26" fill="#c6d1bc" strokeWidth="1" />
        <circle cx={267 + i % 4 * 32} cy={169 + Math.floor(i / 4) * 32} r="1" fill={ink} />
      </g>)}
    </>}
  </g>;
}

function Studio({ feature }: { feature: boolean }) {
  const width = feature ? 240 : 160;
  return <g stroke={ink} strokeWidth="1.5">
    <rect x="100" y="51" width={width} height="160" fill={wall} />
    <path d="M100 158h63v8m0 18v27" fill="none" />
    <path d="M163 166h-18a18 18 0 0 0 18 18" fill="none" strokeWidth="1" />
    <rect x="110" y="165" width="28" height="35" rx="3" fill="#e4e9df" strokeWidth="1" />
    <ellipse cx="151" cy="187" rx="6" ry="9" fill={wall} strokeWidth="1" />
    <rect x="110" y="62" width="43" height="66" rx="2" fill="#d9dfcf" strokeWidth="1" />
    <rect x="115" y="66" width="33" height="14" rx="2" fill={wall} strokeWidth="1" />
    <rect x={100 + width - 21} y="63" width="12" height="80" fill="#d9dfcf" strokeWidth="1" />
    <circle cx={100 + width - 15} cy="75" r="3" /><circle cx={100 + width - 15} cy="85" r="3" />
    <rect x={100 + width - 58} y="171" width="44" height="24" rx="3" fill="#b6c7ac" strokeWidth="1" />
    <circle cx={100 + width - 55} cy="151" r="12" fill="#e6e0cd" strokeWidth="1" />
    <path d={`M178 51h${width - 92}`} stroke={glazing} strokeWidth="4" />
    <path d="M170 211h22" stroke={wall} strokeWidth="3" />
    <path d="M170 211v-22a22 22 0 0 1 22 22" fill="none" strokeWidth="1" />
  </g>;
}

function Scene({ question: q, answer }: { question: Question; answer: AnswerId }) {
  const feature = answer === 'require_feature';
  const kind = q.visualKind;
  const option = q.options[answer];
  if (kind === 'tree') return <Site>
    <TownhomeRow homes={3} x={120} y={145} w={240} h={50} />
    {!feature && <TownhomeRow homes={3} x={120} y={65} w={240} h={50} />}
    {feature ? <Tree x={335} y={82} size={36} plan /> : <>
      <circle cx="335" cy="82" r="39" stroke="#8e9e81" fill="none" strokeDasharray="4 4" />
      <path d="M331 78l8 8m-8 0 8-8" stroke="#7d8e73" />
      {[150, 240, 330].map(x => <Tree key={x} x={x} y={213} size={10} plan />)}
    </>}
  </Site>;
  if (kind === 'front-gardens') return <Site neighbors neighborFront={135}>
    <path d="M240 24V229" stroke="#98a98d" strokeDasharray="4 4" />
    {[104, 260].map(x => <TownhomeRow key={x} homes={option.totalCompletedHomes / 2} x={x} y={45} w={116} h={option.totalCompletedHomes / 2 * 30} vertical />)}
    <path d="M0 135H480" stroke="#8d9c80" strokeDasharray="4 4" opacity=".6" />
    {[160, 320].map(x => <Tree key={x} x={x} y={211} size={9} plan />)}
  </Site>;
  if (kind === 'side-gaps') {
    const width = option.totalCompletedHomes * 50;
    return <Site neighbors>
      <TownhomeRow homes={option.totalCompletedHomes} x={240 - width / 2} y={45} w={width} h={140} />
      <g stroke="#778b6a" strokeWidth="1.2" fill="none">
        <path d={`M89 114h${146 - width / 2}m0-4v8M89 110v8M${245 + width / 2} 114H391m0-4v8M${245 + width / 2} 110v8`} />
      </g>
    </Site>;
  }
  if (kind === 'rear-garden') return <Site>
    <TownhomeRow homes={2} x={140} y={145} w={200} h={50} />
    {!feature && <TownhomeRow homes={2} x={140} y={65} w={200} h={50} />}
    {[145, 335].map(x => <Tree key={x} x={x} y={40} size={11} plan />)}
  </Site>;
  if (kind === 'privacy') return <>
      <path d="M0 220H480" stroke="#b4c0aa" />
      <rect x="300" y="220" width="155" height="14" fill="#dce9cf" />
      <Building floors={option.homesByFloor!.length} x={90} width={140} bottom={220} depth={32} />
      <Tree x={410} y={187} size={24} />
      <rect x="295" y="178" width="10" height="42" fill="#e1ddcc" stroke="#a49e89" />
      <g stroke={ink} strokeDasharray="5 4" strokeWidth="1.2" fill="none">
        {(feature ? [144] : [117, 144]).map(y => <path key={y} d={`M246 ${y}L390 220`} />)}
      </g>
  </>;
  if (kind === 'shadow') {
    const shadowEnd = 200 + option.homesByFloor!.length * 27 * 1.75;
    return <>
      <path d="M0 220H480" stroke="#b4c0aa" />
      <path d="M350 220l32-18h88l-32 18Z" fill="#dce9cf" stroke="#aebda0" />
      <path d={`M80 220l32-18H${shadowEnd + 32}l-32 18Z`} fill="#728579" opacity=".38" />
      <Building floors={option.homesByFloor!.length} x={80} width={120} bottom={220} depth={32} />
      <Tree x={425} y={187} size={24} />
      <g stroke="#a8965f" strokeWidth="1.3" fill="none">
        <circle cx="45" cy="42" r="12" fill="#f5f0db" />
        <path d="M45 23v-7m0 45v7M26 42h-7m45 0h7M31 28l-5-5m33 33 5 5M31 56l-5 5m33-33 5-5M69 66l22 22m-9-1 9 1-1-9" />
      </g>
    </>;
  }
  if (kind === 'height' || kind === 'stepback' || kind === 'heritage' || kind === 'terraces') return <Streetscape>
    <Building floors={option.homesByFloor!.length} floorHomes={option.homesByFloor}
      stepback={kind === 'stepback' && feature} heritage={kind === 'heritage' && feature}
      terraces={kind === 'terraces' && feature} balconies={kind === 'terraces' && !feature} />
  </Streetscape>;
  if (kind === 'private-view' || kind === 'public-view') return <>
    <path d="M0 147L43 111 73 124 135 43 187 105 230 63 284 124 329 83 388 133 429 99 480 145V240H0Z" fill="#d4dfcd" stroke="#97ab8d" />
    <path d="M104 83l31-40 35 42-22-10-13 8-11-11Z" fill="#fafbf8" />
    <path d="M207 87l23-24 27 33-23-9-8 9Z" fill="#fafbf8" />
    <path d="M0 181c71-35 108-17 178-26s102-3 180 12 87 3 122-8V270H0Z" fill="#c3d2b7" />
    <Building floors={option.homesByFloor!.length} x={155} width={186} bottom={245} />
    {kind === 'private-view' ? <g fill="#edece2" stroke={ink} strokeWidth="1.5">
      <path d="M0 0h18v270H0ZM462 0h18v270h-18ZM18 0h444v12H18ZM8 253H472v17H8Z" />
      <path d="M76 12v241M405 12v241" fill="none" />
    </g> : <g stroke={ink} strokeWidth="1.5" fill="#e0ddce">
      <path d="M0 247H480v23H0Z" fill="#e8ebdf" stroke="none" />
      <path d="M14 229H466M25 229v29m75-29v29m280-29v29m75-29v29" />
      <path d="M34 217h87v18H34ZM30 240h95m-87 0v16m78-16v16" />
    </g>}
  </>;
  if (kind === 'parking') return <Site>
    <PlanBuilding x={107} y={43} w={249} h={feature ? 82 : 122} />
    {Array.from({ length: feature ? 12 : 4 }, (_, i) => {
      const x = feature ? 102 + i % 6 * 46 : 148 + i * 46;
      const y = feature && i < 6 ? 141 : 200;
      return <g key={i} stroke={ink} strokeWidth="1">
        <path d={`M${x} ${y}v23h40v-23`} fill="#f8f9f2" />
        <rect x={x + 8} y={y + 6} width="25" height="12" rx="4" fill="#c5d2bc" />
        <path d={`M${x + 14} ${y + 7}v10m13-10v10`} />
      </g>;
    })}
  </Site>;
  if (kind === 'studio') return <Studio feature={feature} />;
  if (kind === 'stairs') return <PointAccessFloor feature={feature} />;
  if (kind === 'storage' || kind === 'windows') return <ApartmentFloor kind={kind} feature={feature} />;
  if (kind === 'affordable-count' || kind === 'affordable-depth') {
    return <>{Array.from({ length: option.totalCompletedHomes }, (_, i) => <rect key={i}
      x={174 + i % 4 * 36} y={225 - Math.floor(i / 4) * 34} width="24" height="24" rx="2"
      fill={i < option.marketHomes! ? '#d9dfd4' : '#5c806d'} stroke={i < option.marketHomes! ? '#afbea5' : '#496b58'} strokeWidth=".8" />)}</>;
  }
  if (kind === 'relocation') return <>
    <rect x="20" y="40" width="184" height="186" fill="#e9efdf" stroke="#98a98d" strokeDasharray="4 4" />
    <rect x="268" y="40" width="184" height="186" fill="#e9efdf" stroke="#98a98d" strokeDasharray="4 4" />
    <Building floors={q.existingHomesByFloor.length} x={33} width={62} depth={20} bottom={205} />
    <path d="M220 136h30m-8-7 8 7-8 7" stroke={ink} strokeWidth="1.5" fill="none" />
    {feature ? <>
      <Building floors={q.existingHomesByFloor.length} x={281} width={62} depth={20} bottom={205} />
      <Building floors={option.homesByFloor!.length} x={369} width={60} depth={20} bottom={205} />
    </> : <Building floors={option.homesByFloor!.length} x={319} width={62} depth={20} bottom={205} />}
  </>;
  return null;
}

function Legend({ question, answer }: { question: Question; answer: AnswerId }) {
  const option = question.options[answer];
  const floors = option.homesByFloor;
  const floorSummary = floors && (floors.every(n => n === floors[0])
    ? `${floors.length} storeys · ${floors[0]} homes per floor`
    : `Homes by floor, bottom to top: ${floors.join(' + ')}`);
  if (question.visualKind === 'affordable-count' || question.visualKind === 'affordable-depth') return <figcaption className="composition-legend">
    <span><i className="swatch market" />{option.marketHomes} market-rate</span>
    <span><i className="swatch restricted" />{option.restrictedHomes} income-restricted</span>
    <small>Each square is one home · Each row is one floor</small>
  </figcaption>;
  if (question.visualKind === 'relocation') return <figcaption className="relocation-legend"><span>Before: {question.existingHomes} homes</span><span>After: {option.totalCompletedHomes} homes</span></figcaption>;
  const notes: Partial<Record<Question['visualKind'], string>> = {
    tree: 'Site plan · Each roof outline is one townhome', 'front-gardens': 'Two parcels · Street at the bottom', 'side-gaps': 'Site plan · Each roof outline is one home',
    'rear-garden': 'Site plan · Rear garden at the top', privacy: 'Dashed lines show views into the neighboring garden',
    shadow: 'Schematic shadow · 21 December', parking: 'Site plan', studio: 'Representative studio · Both plans at the same scale',
    windows: 'Highlighted lines show exterior windows', storage: 'Ground-floor plan · Upper floors have four homes each', stairs: `Typical floor · Four ${option.bedroomsPerHome}-bedroom homes`,
  };
  return notes[question.visualKind] || floorSummary ? <figcaption>
    {notes[question.visualKind]}
    {floorSummary && <small>{floorSummary}</small>}
  </figcaption> : null;
}

export function Illustration({ question, answer }: { question: Question; answer: AnswerId }) {
  const id = useId();
  return <figure className={`illustration illustration-${question.visualKind}`}>
    <svg viewBox="0 0 480 270" role="img" aria-labelledby={id} data-scene={question.sharedSceneId}>
      <title id={id}>{question.options[answer].visualDescription}</title>
      <Scene question={question} answer={answer} />
    </svg>
    <Legend question={question} answer={answer} />
  </figure>;
}
