/**
 * keplerAudio —— 星空的全部声音都由 Web Audio 现算，不加载任何音效包。
 *
 *   chime()        悬停 / 点亮的星辰泛音：两个正弦 + 一个三角波，指数衰减
 *   startAmbient() 没有音频 URL 时的「氛围八音盒」兜底试听，返回停止函数
 *
 * 全部懒初始化：没有用户手势之前不创建 AudioContext，避免浏览器警告。
 */

type Ctx = AudioContext & { __kpUnlocked?: boolean };

let ctx: Ctx | null = null;

function ensure(): Ctx | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC() as Ctx;
  } catch {
    return null;
  }
  return ctx;
}

/** 浏览器策略：必须由一次真实手势触发 resume */
export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
}

let master: GainNode | null = null;

function bus(c: Ctx): GainNode {
  if (!master) {
    master = c.createGain();
    master.gain.value = 0.9;
    master.connect(c.destination);
  }
  return master;
}

/**
 * 空灵泛音：基频 + 五度 + 十二度，随机微失谐，2.2 秒衰减。
 * @param base 基频（Hz）
 * @param level 0~1 音量
 */
export function chime(base = 880, level = 0.18) {
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  const t0 = c.currentTime;

  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.exponentialRampToValueAtTime(Math.max(level, 0.0002), t0 + 0.012);
  out.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);

  // 一点点低通，去掉数字味的毛刺
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(4200, t0);
  lp.frequency.exponentialRampToValueAtTime(1400, t0 + 2);

  out.connect(lp);
  lp.connect(bus(c));

  const partials = [
    { ratio: 1, gain: 1, type: 'sine' as OscillatorType },
    { ratio: 1.5, gain: 0.42, type: 'sine' as OscillatorType },
    { ratio: 2.01, gain: 0.2, type: 'triangle' as OscillatorType },
  ];

  for (const p of partials) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = p.type;
    osc.frequency.value = base * p.ratio * (1 + (Math.random() - 0.5) * 0.004);
    g.gain.value = p.gain;
    osc.connect(g);
    g.connect(out);
    osc.start(t0);
    osc.stop(t0 + 2.4);
  }
}

/** A 小调五声音阶（音乐盒常用音区） */
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

interface AmbientHandle {
  stop: () => void;
  setLevel: (v: number) => void;
}

/**
 * 氛围八音盒：以 340ms 为步长随机挑音，偶尔叠一个空八度。
 * 完全由定时器驱动，离开卡片时调用 stop() 立刻收声。
 */
export function startAmbient(): AmbientHandle {
  const c = ensure();
  if (!c) return { stop: () => {}, setLevel: () => {} };
  if (c.state === 'suspended') void c.resume();

  const out = c.createGain();
  out.gain.value = 0.0001;
  out.connect(bus(c));
  out.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 1.4);

  let stopped = false;
  let last = 3;
  let timer = 0;

  const voice = (freq: number, at: number, vol: number) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.8);
    osc.connect(g);
    g.connect(out);
    osc.start(at);
    osc.stop(at + 1.9);
  };

  const step = () => {
    if (stopped) return;
    // 随机游走，避免听起来像琶音练习
    const jump = Math.floor(Math.random() * 4) - 1;
    last = Math.max(0, Math.min(SCALE.length - 1, last + jump));
    const at = c.currentTime + 0.02;
    voice(SCALE[last], at, 0.16);
    if (Math.random() < 0.26) voice(SCALE[last] * 2, at + 0.14, 0.06);
    if (Math.random() < 0.12) voice(SCALE[Math.max(0, last - 2)] / 2, at + 0.3, 0.09);
    timer = window.setTimeout(step, 300 + Math.random() * 220);
  };

  timer = window.setTimeout(step, 60);

  return {
    stop: () => {
      stopped = true;
      window.clearTimeout(timer);
      try {
        out.gain.cancelScheduledValues(c.currentTime);
        out.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.35);
      } catch {
        /* 已关闭 */
      }
      window.setTimeout(() => {
        try {
          out.disconnect();
        } catch {
          /* noop */
        }
      }, 500);
    },
    setLevel: (v: number) => {
      try {
        out.gain.value = Math.max(0, Math.min(1, v)) * 0.5;
      } catch {
        /* noop */
      }
    },
  };
}
