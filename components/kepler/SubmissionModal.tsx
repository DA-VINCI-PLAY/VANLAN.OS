'use client';

/**
 * SubmissionModal —— 星空投稿舱（R67 / R82）
 *
 * 提交后纯本地落库（vanlan_submissions），零外发：
 *   数据直达 VANLAN.OS 管理员终端后台，由管理员「点亮成星星」
 * 视觉上表单会化作一颗流星划出画面，再给出回执。
 */

import { useState } from 'react';
import {
  SUBMISSION_KIND_LABEL,
  useSubmissions,
  useKeplerUI,
  type SubmissionKind,
} from '@/lib/kepler';
import { chime, unlockAudio } from '@/lib/keplerAudio';

type Status = 'idle' | 'sending' | 'done';

const KINDS: SubmissionKind[] = ['music', 'lyric', 'story'];

export default function SubmissionModal() {
  const open = useKeplerUI((s) => s.submitOpen);
  const setOpen = useKeplerUI((s) => s.setSubmitOpen);
  const add = useSubmissions((s) => s.add);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<SubmissionKind>('story');
  const [lyric, setLyric] = useState('');
  const [story, setStory] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [meteor, setMeteor] = useState(false);
  const [err, setErr] = useState('');
  /** R80：必填项校验失败时抖一下（值保留 420ms 后自动清除） */
  const [shake, setShake] = useState<'' | 'lyric' | 'contact'>('');
  /** 回执里展示的投稿编号（短码，方便对后台） */
  const [ticket, setTicket] = useState('');

  if (!open) return null;

  const reset = () => {
    setName('');
    setKind('story');
    setLyric('');
    setStory('');
    setContact('');
    setStatus('idle');
    setErr('');
    setShake('');
    setMeteor(false);
    setTicket('');
  };

  const close = () => {
    setOpen(false);
    window.setTimeout(reset, 260);
  };

  const submit = async () => {
    if (lyric.trim().length < 2) {
      setErr('至少留一句歌词 / 金句，它会成为星星旁的那行字。');
      setShake('lyric');
      window.setTimeout(() => setShake(''), 460);
      return;
    }
    if (!contact.trim()) {
      setErr('留个联系方式吧，我想亲自回你。');
      setShake('contact');
      window.setTimeout(() => setShake(''), 460);
      return;
    }
    setErr('');
    setStatus('sending');
    unlockAudio();
    chime(1046.5, 0.16);

    const sub = add({
      name: name.trim() || '匿名旅人',
      kind,
      lyric: lyric.trim().slice(0, 30),
      story: story.trim(),
      contact: contact.trim(),
    });
    setTicket(sub.id.replace(/^sub-/, '').toUpperCase().slice(0, 6));

    setMeteor(true);
    await new Promise((r) => window.setTimeout(r, 1250));
    setStatus('done');
  };

  return (
    <div className="kp-sub" role="dialog" aria-modal="true" aria-label="摘星投稿">
      <div className="kp-sub-backdrop" onClick={close} />
      <div className={`kp-sub-card${meteor ? ' is-launching' : ''}`} data-drawer>
        <header className="kp-sub-head">
          <div>
            <span className="kp-sub-kicker">PLANT A STAR // 种下一颗星</span>
            <h3>把你的故事，也种进这片星空</h3>
          </div>
          <button type="button" className="kp-sub-close" onClick={close} aria-label="关闭投稿">
            ✕
          </button>
        </header>

        {status === 'done' ? (
          <div className="kp-sub-done">
            <div className="kp-sub-receipt">✦</div>
            <p className="kp-sub-done-title">
              ✦ 成功发射！你的故事已直达 VANLAN.OS 管理员终端后台。
            </p>
            <p className="kp-sub-done-sub">
              {`投稿编号 ${ticket} · 我在后台读完会把它点亮成公开的星星；在星图列表的「我的投稿」里可以看到进度。`}
            </p>
            <div className="kp-sub-done-actions">
              <button type="button" onClick={reset}>再种一颗</button>
              <button type="button" className="is-primary" onClick={close}>回到星图</button>
            </div>
          </div>
        ) : (
          <>
            <div className="kp-sub-grid">
              <label className="kp-field">
                <span>你的署名 / 星星代号</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="匿名旅人 / @小鹿"
                  maxLength={24}
                />
              </label>

              <div className="kp-field">
                <span>投稿类型</span>
                <div className="kp-kind-row">
                  {KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={kind === k ? 'is-on' : ''}
                      onClick={() => setKind(k)}
                      aria-pressed={kind === k}
                    >
                      {SUBMISSION_KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>

              <label
                className={`kp-field kp-field-wide${shake === 'lyric' ? ' is-shake' : ''}`}
              >
                <span>
                  核心金句 / 一句歌词 <i>必填 · {lyric.length}/30</i>
                </span>
                <input
                  value={lyric}
                  onChange={(e) => {
                    setLyric(e.target.value);
                    if (shake === 'lyric') setShake('');
                  }}
                  placeholder="它会浮在这颗星星旁边"
                  maxLength={30}
                  aria-invalid={shake === 'lyric'}
                />
              </label>

              <label className="kp-field kp-field-wide">
                <span>背后的故事 / 作品链接</span>
                <textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="写下那段记忆，或贴一个网易云 / B站 / 网盘链接"
                  rows={4}
                  maxLength={900}
                />
              </label>

              <label
                className={`kp-field kp-field-wide${shake === 'contact' ? ' is-shake' : ''}`}
              >
                <span>联系方式 <i>微信 / 邮箱 / QQ</i></span>
                <input
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                    if (shake === 'contact') setShake('');
                  }}
                  placeholder="方便我回信"
                  maxLength={60}
                  aria-invalid={shake === 'contact'}
                />
              </label>
            </div>

            {err && <p className="kp-sub-err">{err}</p>}

            <footer className="kp-sub-foot">
              <span>投稿零外发 · 直达管理员终端后台</span>
              <button
                type="button"
                className="kp-sub-submit"
                onClick={submit}
                disabled={status === 'sending'}
              >
                {status === 'sending' ? '正在发射…' : '发射至克卜勒星空 · SUBMIT'}
              </button>
            </footer>
          </>
        )}

        {meteor && <div className="kp-meteor" aria-hidden><i /></div>}
      </div>
    </div>
  );
}
