// 切片解码：TopoJSON → 投影后的 SVG 路径串、包围盒、标注锚点、国界分块与邻接关系（在后台线程执行）
import { feature, mesh, neighbors } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, MultiLineString, MultiPolygon, Polygon } from 'geojson';
import { geoPath } from 'd3-geo';
import { BASE_H, BASE_W, project, projection, type Box } from './projection';
import type { DecodedPolity, DecodedSnapshot, PolityProps } from './snapshots';

const path = geoPath(projection);

// 国界分块的网格：按弧段包围盒中心归入 32×16 格
const GRID_X = 32;
const GRID_Y = 16;

function toPolity(f: Feature<Polygon | MultiPolygon, PolityProps>): DecodedPolity {
  const p = f.properties;
  const [[x0, y0], [x1, y1]] = path.bounds(f);
  return {
    name: p.n,
    subj: p.s,
    prec: p.p ?? 1,
    fixed: p.x === 1,
    area: p.a,
    anchor: p.l ? project(p.l) : null,
    r: p.r ?? 0,
    d: path(f) ?? '',
    bbox: [x0, y0, x1, y1],
  };
}

function borderPieces(lines: MultiLineString): DecodedSnapshot['borders'] {
  const cells = new Map<number, { d: string[]; box: Box }>();
  for (const coordinates of lines.coordinates) {
    const line = { type: 'LineString', coordinates } as const;
    const [[x0, y0], [x1, y1]] = path.bounds(line);
    const gx = Math.min(GRID_X - 1, Math.max(0, Math.floor(((x0 + x1) / 2 / BASE_W) * GRID_X)));
    const gy = Math.min(GRID_Y - 1, Math.max(0, Math.floor(((y0 + y1) / 2 / BASE_H) * GRID_Y)));
    const key = gy * GRID_X + gx;
    let cell = cells.get(key);
    if (!cell) cells.set(key, (cell = { d: [], box: [x0, y0, x1, y1] }));
    cell.d.push(path(line) ?? '');
    cell.box = [Math.min(cell.box[0], x0), Math.min(cell.box[1], y0), Math.max(cell.box[2], x1), Math.max(cell.box[3], y1)];
  }
  return [...cells.values()].map(({ d, box }) => ({ d: d.join(''), box }));
}

export function decodeTopology(topo: Topology): DecodedSnapshot {
  const object = topo.objects.polities as GeometryCollection<PolityProps>;
  const polities = feature(topo, object).features.map((f) => toPolity(f as Feature<Polygon | MultiPolygon, PolityProps>));
  return {
    polities,
    borders: borderPieces(mesh(topo, object, (a, b) => a !== b)),
    neighbors: neighbors(object.geometries),
  };
}
