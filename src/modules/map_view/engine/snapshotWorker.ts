// 切片解码线程：拉取 TopoJSON、投影并序列化为 SVG 路径串，主线程只需据此构造 Path2D
import type { Topology } from 'topojson-specification';
import { decodeTopology } from './decode';
import type { DecodeRequest, DecodeResponse } from './snapshots';

const reply = (msg: DecodeResponse) => (self as unknown as Worker).postMessage(msg);

self.onmessage = async ({ data: { id, url } }: MessageEvent<DecodeRequest>) => {
  try {
    const topo = (await (await fetch(url)).json()) as Topology;
    reply({ id, data: decodeTopology(topo) });
  } catch (e) {
    reply({ id, error: String(e) });
  }
};
