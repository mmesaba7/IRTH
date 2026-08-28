import * as MP4Box from "mp4box";

type Mp4Info = {
  duration: number;
  timescale: number;
  videoTracks: unknown[];
};

export async function getMp4Duration(
  buffer: ArrayBuffer
): Promise<number> {
  return new Promise((resolve, reject) => {
    const mp4boxFile = MP4Box.createFile();

    mp4boxFile.onError = (error) => {
      reject(new Error(`Invalid MP4 file: ${String(error)}`));
    };

    mp4boxFile.onReady = (info: Mp4Info) => {
      if (!info.videoTracks || info.videoTracks.length === 0) {
        reject(new Error("MP4 file does not contain a video track"));
        return;
      }

      if (
        !Number.isFinite(info.duration) ||
        !Number.isFinite(info.timescale) ||
        info.timescale <= 0
      ) {
        reject(new Error("Could not determine MP4 duration"));
        return;
      }

      const durationSeconds =
        info.duration / info.timescale;

      if (
        !Number.isFinite(durationSeconds) ||
        durationSeconds <= 0
      ) {
        reject(new Error("Invalid MP4 duration"));
        return;
      }

      resolve(durationSeconds);
    };

    const mp4Buffer = buffer as ArrayBuffer & {
      fileStart: number;
    };

    mp4Buffer.fileStart = 0;

    mp4boxFile.appendBuffer(mp4Buffer);
    mp4boxFile.flush();
  });
}