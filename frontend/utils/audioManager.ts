// 音频管理器 - 处理音频采集和播放

export class AudioManager {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private audioQueue: Float32Array[] = [];
    private isPlaying: boolean = false;
    private sampleRate: number = 16000;

    // 初始化音频上下文
    async init() {
        this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    }

    // 开始采集麦克风音频
    async startCapture(onAudioData: (data: ArrayBuffer) => void) {
        try {
            // 获取麦克风权限
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.sampleRate,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            if (!this.audioContext) {
                await this.init();
            }

            // 创建音频源
            this.source = this.audioContext!.createMediaStreamSource(this.mediaStream);

            // 创建处理器节点（4096 采样点缓冲区）
            this.processor = this.audioContext!.createScriptProcessor(4096, 1, 1);

            this.processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0); // Float32Array
                const pcmData = this.float32ToPCM16(inputData);
                // 确保返回 ArrayBuffer 类型
                const buffer = pcmData.buffer as ArrayBuffer;
                onAudioData(buffer);
            };

            // 连接节点
            this.source.connect(this.processor);
            this.processor.connect(this.audioContext!.destination);

            console.log('音频采集已启动');
        } catch (error) {
            console.error('启动音频采集失败:', error);
            throw error;
        }
    }

    // 停止采集
    stopCapture() {
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }

        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        console.log('音频采集已停止');
    }

    // 播放接收到的音频数据
    async playAudio(audioData: ArrayBuffer | Blob) {
        try {
            if (!this.audioContext) {
                await this.init();
            }

            let arrayBuffer: ArrayBuffer;

            if (audioData instanceof Blob) {
                arrayBuffer = await audioData.arrayBuffer();
            } else {
                arrayBuffer = audioData;
            }

            // 将 PCM16 转换为 Float32
            const pcm16 = new Int16Array(arrayBuffer);
            const float32 = this.pcm16ToFloat32(pcm16);

            // 创建音频缓冲区
            const audioBuffer = this.audioContext!.createBuffer(
                1,
                float32.length,
                this.sampleRate
            );
            audioBuffer.getChannelData(0).set(float32);

            // 创建音频源并播放
            const source = this.audioContext!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext!.destination);
            source.start();

        } catch (error) {
            console.error('播放音频失败:', error);
        }
    }

    // Float32 转 PCM16
    private float32ToPCM16(float32Array: Float32Array): Int16Array {
        const pcm16 = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return pcm16;
    }

    // PCM16 转 Float32
    private pcm16ToFloat32(pcm16Array: Int16Array): Float32Array {
        const float32 = new Float32Array(pcm16Array.length);
        for (let i = 0; i < pcm16Array.length; i++) {
            float32[i] = pcm16Array[i] / (pcm16Array[i] < 0 ? 0x8000 : 0x7FFF);
        }
        return float32;
    }

    // 清理资源
    cleanup() {
        this.stopCapture();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.audioQueue = [];
    }
}
