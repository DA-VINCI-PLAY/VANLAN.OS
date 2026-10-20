'use client';

/**
 * KeplerAdmin —— 后台的「克卜勒星空」两块面板（R67）
 *
 *   KeplerStarsPanel  星体 CRUD：名称 / 专辑 / 歌词 / 故事 / 封面 / 音频 / 等级
 *   KeplerInboxPanel  访客投稿收件箱，一键点亮成公开星星
 *
 * 数据全部落在 localStorage（vanlan_kepler_stars / vanlan_submissions），
 * 和新星自动分配球面坐标，保存后回到星图刷新即可看到。
 */

import { useState } from 'react';
import {
  KIND_COLOR,
  KIND_LABEL,
  SUBMISSION_KIND_LABEL,
  autoOrbit,
  submissionToStarDraft,
  useKeplerStars,
  useSubmissions,
  type KeplerStar,
  type StarDraft,
  type StarKind,
} from '@/lib/kepler';

const FIELD =
  'w-full rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-[12px] text-ink placeholder:text-ink/25 outline-none transition-colors duration-200 focus:border-[#F35A17]/60';
const LABEL = 'mb-1 block font-mono text-[8px] tracking-[0.2em] text-ink/40';

const KINDS: StarKind[] = ['star', 'planet', 'meteor'];

const EMPTY: StarDraft = {
  name: '',
  album: '诊疗日志',
  lyric: '',
  story: '',
  cover: '',
  audio: '',
  kind: 'planet',
  color: '',
  year: String(new Date().getFullYear()),
  roles: '作词 / 作曲 / 编曲',
};

const deg = (rad: number) => Math.round((rad * 180) / Math.PI);

export function KeplerStarsPanel() {
  const stars = useKeplerStars((s) => s.stars);
  const addStar = useKeplerStars((s) => s.addStar);
  const updateStar = useKeplerStars((s) => s.updateStar);
  const removeStar = useKeplerStars((s) => s.removeStar);
  const resetStars = useKeplerStars((s) => s.resetStars);

  const [draft, setDraft] = useState<StarDraft>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const set = <K extends keyof StarDraft>(k: K, v: StarDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const submit = () => {
    const clean: StarDraft = {
      ...draft,
      name: draft.name.trim(),
      album: draft.album.trim() || '未命名星座',
      lyric: draft.lyric.trim(),
      story: draft.story.trim(),
      cover: (draft.cover || '').trim(),
      audio: (draft.audio || '').trim(),
      color: (draft.color || '').trim(),
      year: (draft.year || '').trim(),
      roles: (draft.roles || '').trim(),
    };
    if (!clean.name) return;
    if (editing) {
      updateStar(editing, clean);
      setEditing(null);
    } else {
      addStar(clean);
    }
    setDraft(EMPTY);
  };

  const startEdit = (s: KeplerStar) => {
    setEditing(s.id);
    setDraft({
      name: s.name,
      album: s.album,
      lyric: s.lyric,
      story: s.story,
      cover: s.cover,
      audio: s.audio,
      kind: s.kind,
      color: s.color,
      year: s.year,
      roles: s.roles,
      theta: s.theta,
      phi: s.phi,
      radius: s.radius,
    });
  };

  const rerollOrbit = () => {
    const o = autoOrbit(Math.floor(Math.random() * 12));
    setDraft((d) => ({ ...d, theta: o.theta, phi: o.phi, radius: o.radius }));
  };

  return (
    <div className="mx-auto grid max-w-[1100px] gap-4 lg:grid-cols-[380px_1fr]">
      <section className="h-fit rounded-xl border border-black/[0.08] bg-black/[0.02] p-4">
        <div className="flex items-center justify-between">
          <span className={LABEL.replace('mb-1', 'mb-0')}>
            {editing ? 'EDIT STAR' : 'PLANT A NEW STAR'}
          </span>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraft(EMPTY);
              }}
              className="font-mono text-[8px] tracking-[0.14em] text-ink/35 hover:text-ink"
            >
              CANCEL
            </button>
          )}
        </div>

        <div className="mt-3 space-y-2.5">
          <div>
            <label className={LABEL} htmlFor="k-name">星星名称 / 歌曲名</label>
            <input
              id="k-name"
              className={FIELD}
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="《诊疗日志》"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL} htmlFor="k-album">专辑 / 星座分组</label>
              <input
                id="k-album"
                className={FIELD}
                value={draft.album}
                onChange={(e) => set('album', e.target.value)}
                placeholder="诊疗日志"
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="k-year">年份 / 标签</label>
              <input
                id="k-year"
                className={FIELD}
                value={draft.year}
                onChange={(e) => set('year', e.target.value)}
                placeholder="2026"
              />
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="k-lyric">悬浮歌词（≤ 30 字）</label>
            <input
              id="k-lyric"
              className={FIELD}
              maxLength={30}
              value={draft.lyric}
              onChange={(e) => set('lyric', e.target.value)}
              placeholder="藏在众多孤星之中，还是找得到你。"
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="k-story">背后的故事</label>
            <textarea
              id="k-story"
              className={`${FIELD} min-h-[110px] resize-y leading-relaxed`}
              value={draft.story}
              onChange={(e) => set('story', e.target.value)}
              placeholder="写完这首歌的那个晚上……（空行分段）"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={LABEL} htmlFor="k-cover">封面图 URL</label>
              <input
                id="k-cover"
                className={FIELD}
                value={draft.cover}
                onChange={(e) => set('cover', e.target.value)}
                placeholder="/covers/xx.png"
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="k-audio">音频 URL</label>
              <input
                id="k-audio"
                className={FIELD}
                value={draft.audio}
                onChange={(e) => set('audio', e.target.value)}
                placeholder="/audio/xx.mp3"
              />
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="k-roles">身份标签</label>
            <input
              id="k-roles"
              className={FIELD}
              value={draft.roles}
              onChange={(e) => set('roles', e.target.value)}
              placeholder="作词 / 作曲 / 编曲 / 混音"
            />
          </div>

          <div>
            <span className={LABEL}>星体等级</span>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set('kind', k)}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[8.5px] tracking-[0.1em] transition-colors ${
                    draft.kind === k
                      ? 'border-[#F35A17] bg-[#F35A17] text-white'
                      : 'border-black/10 text-ink/45 hover:border-black/25 hover:text-ink'
                  }`}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className={LABEL} htmlFor="k-color">星体颜色</label>
              <div className="flex items-center gap-2">
                <input
                  id="k-color"
                  type="color"
                  value={draft.color || KIND_COLOR[draft.kind ?? 'planet']}
                  onChange={(e) => set('color', e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-black/10 bg-transparent"
                />
                <input
                  className={FIELD}
                  value={draft.color}
                  onChange={(e) => set('color', e.target.value)}
                  placeholder="留空 = 按等级默认"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={rerollOrbit}
              className="shrink-0 rounded-lg border border-black/10 px-3 py-2 font-mono text-[8px] tracking-[0.12em] text-ink/50 hover:border-black/25 hover:text-ink"
            >
              换轨道
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-[9px] text-ink/45">
            <span>θ {draft.theta !== undefined ? deg(draft.theta) + '°' : '自动'}</span>
            <span>φ {draft.phi !== undefined ? deg(draft.phi) + '°' : '自动'}</span>
            <span>R {draft.radius !== undefined ? draft.radius.toFixed(2) : '自动'}</span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={submit}
              className="os-btn-accent flex-1 rounded-lg py-2.5 font-mono text-[10px] font-semibold tracking-[0.2em]"
            >
              {editing ? 'SAVE STAR' : 'PLANT STAR'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  removeStar(editing);
                  setEditing(null);
                  setDraft(EMPTY);
                }}
                className="rounded-lg border border-black/10 px-3 font-mono text-[9px] tracking-[0.14em] text-ink/40 hover:border-[#F35A17]/50 hover:text-[#F35A17]"
              >
                DEL
              </button>
            )}
          </div>

          <p className="pt-1 font-mono text-[8px] leading-relaxed text-ink/30">
            新星按黄金角自动分配球面坐标；填了音频就会真的播放，空着走合成八音盒。
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className={LABEL.replace('mb-1', 'mb-0')}>STARFIELD · {stars.length}</span>
          <button
            type="button"
            onClick={() => {
              if (confirmReset) {
                resetStars();
                setConfirmReset(false);
              } else {
                setConfirmReset(true);
                window.setTimeout(() => setConfirmReset(false), 3000);
              }
            }}
            className="font-mono text-[8px] tracking-[0.14em] text-ink/30 hover:text-[#F35A17]"
          >
            {confirmReset ? 'CONFIRM RESET?' : 'RESET DEFAULT'}
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {stars.map((s) => (
            <article
              key={s.id}
              className="rounded-xl border border-black/[0.08] bg-white/60 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <i
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: s.color || KIND_COLOR[s.kind] }}
                    />
                    <h4 className="truncate text-[12px] font-semibold tracking-[0.04em] text-ink">
                      {s.name}
                    </h4>
                  </div>
                  <p className="mt-0.5 font-mono text-[8px] tracking-[0.1em] text-ink/35">
                    {s.album} · {s.kind.toUpperCase()} · {s.year || '—'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    className="rounded-md border border-black/10 px-2 py-1 font-mono text-[8px] tracking-[0.12em] text-ink/45 hover:border-black/25 hover:text-ink"
                  >
                    EDIT
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStar(s.id)}
                    className="rounded-md border border-black/10 px-2 py-1 font-mono text-[8px] text-ink/30 hover:border-[#F35A17]/50 hover:text-[#F35A17]"
                  >
                    ×
                  </button>
                </div>
              </div>
              {s.lyric && (
                <p className="mt-2 line-clamp-2 font-serif text-[10.5px] leading-relaxed text-ink/60">
                  「{s.lyric}」
                </p>
              )}
              <div className="mt-2 flex gap-2 font-mono text-[7.5px] text-ink/30">
                <span>θ{deg(s.theta)}°</span>
                <span>φ{deg(s.phi)}°</span>
                <span>R{s.radius.toFixed(1)}</span>
                <span className={s.audio ? 'text-[#1a8a4a]' : ''}>
                  {s.audio ? 'AUDIO' : 'SYNTH'}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function KeplerInboxPanel() {
  const list = useSubmissions((s) => s.list);
  const remove = useSubmissions((s) => s.remove);
  const markLit = useSubmissions((s) => s.markLit);
  const addStar = useKeplerStars((s) => s.addStar);

  const [expanded, setExpanded] = useState<string | null>(null);

  const lightUp = (id: string) => {
    const sub = list.find((s) => s.id === id);
    if (!sub || sub.litStarId) return;
    const star = addStar(submissionToStarDraft(sub));
    markLit(id, star.id);
  };

  return (
    <div className="mx-auto max-w-[900px] space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className={LABEL.replace('mb-1', 'mb-0')}>INBOX · {list.length}</span>
        <span className="font-mono text-[8px] tracking-[0.12em] text-ink/30">
          点亮的投稿会立刻出现在星图「访客星座」里
        </span>
      </div>

      {list.length === 0 && (
        <p className="rounded-xl border border-dashed border-black/10 px-4 py-10 text-center text-[11px] text-ink/35">
          还没有人投过稿。星图底部的「摘星投稿」会把信送到这里。
        </p>
      )}

      {list.map((s) => (
        <article key={s.id} className="rounded-xl border border-black/[0.08] bg-white/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-[12px] font-semibold text-ink">{s.name}</h4>
                <span className="rounded-full bg-[#F35A17]/10 px-2 py-0.5 font-mono text-[7.5px] tracking-[0.1em] text-[#F35A17]">
                  {SUBMISSION_KIND_LABEL[s.kind]}
                </span>
                {s.litStarId && (
                  <span className="rounded-full bg-[#1a8a4a]/10 px-2 py-0.5 font-mono text-[7.5px] tracking-[0.1em] text-[#1a8a4a]">
                    LIT ✓
                  </span>
                )}
              </div>
              <p className="mt-1.5 font-serif text-[11px] leading-relaxed text-ink/70">
                「{s.lyric}」
              </p>
              <p className="mt-1 font-mono text-[8px] tracking-[0.08em] text-ink/30">
                {s.contact} · {new Date(s.createdAt).toLocaleString('zh-CN', { hour12: false })}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              <button
                type="button"
                disabled={Boolean(s.litStarId)}
                onClick={() => lightUp(s.id)}
                className="rounded-md border border-[#F35A17]/40 px-2.5 py-1 font-mono text-[8px] tracking-[0.12em] text-[#F35A17] transition-colors hover:bg-[#F35A17] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#F35A17]"
              >
                {s.litStarId ? '已点亮' : '点亮为星星'}
              </button>
              <button
                type="button"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                className="rounded-md border border-black/10 px-2 py-1 font-mono text-[8px] tracking-[0.12em] text-ink/45 hover:border-black/25 hover:text-ink"
              >
                {expanded === s.id ? 'HIDE' : 'READ'}
              </button>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="rounded-md border border-black/10 px-2 py-1 font-mono text-[8px] text-ink/30 hover:border-[#F35A17]/50 hover:text-[#F35A17]"
              >
                ×
              </button>
            </div>
          </div>

          {expanded === s.id && (
            <p className="mt-3 whitespace-pre-wrap border-t border-black/[0.07] pt-3 text-[10.5px] leading-relaxed text-ink/60">
              {s.story || '（这位访客只留了一句歌词。）'}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
