// [第三阶段-音效] Web Audio API 8-bit 复古音效引擎
const SFX = (() => {
    let ctx = null;

    function getCtx() {
        if (!ctx) {
            try {
                ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) { return null; }
        }
        return ctx;
    }

    // 基础合成音 (frequency: Hz, type: sine/square/sawtooth, duration: ms)
    function beep(frequency, type, duration, volume = 0.18) {
        const c = getCtx();
        if (!c) return;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, c.currentTime);
        gain.gain.setValueAtTime(volume, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration / 1000);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + duration / 1000);
    }

    return {
        // 战斗爆发：双音低沉打击
        war() {
            beep(180, "sawtooth", 80, 0.22);
            setTimeout(() => beep(140, "sawtooth", 120, 0.18), 70);
        },
        // 攻城得手：上扬三级音阶
        victory() {
            beep(523, "square", 80);
            setTimeout(() => beep(659, "square", 80), 90);
            setTimeout(() => beep(784, "square", 160), 180);
        },
        // 天下一统：宏大五音
        unify() {
            [392, 523, 659, 784, 1047].forEach((f, i) => {
                setTimeout(() => beep(f, "square", 200, 0.25), i * 130);
            });
        },
        // 锦囊凝聚：清脆提示音
        card() {
            beep(880, "sine", 60, 0.12);
            setTimeout(() => beep(1047, "sine", 90, 0.10), 70);
        },
        // 存档成功：短促双音
        save() {
            beep(440, "sine", 60, 0.10);
            setTimeout(() => beep(660, "sine", 80, 0.10), 70);
        },
        // 施放计策
        tactic() {
            beep(600, "sawtooth", 50, 0.14);
            setTimeout(() => beep(400, "sawtooth", 100, 0.10), 60);
        }
    };
})();
