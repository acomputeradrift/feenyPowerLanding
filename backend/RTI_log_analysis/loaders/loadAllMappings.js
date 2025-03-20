import { loadAudioZoneList } from './loadAudioZoneList.js';
import { loadButtonList } from './loadButtonList.js';
import { loadLightingLoadList } from './loadLightingLoadList.js';
import { loadPageList } from './loadPageList.js';
import { loadPortList } from './loadPortList.js';
import { loadSourceList } from './loadSourceList.js';
import { loadTaskList } from './loadTaskList.js';

export function loadAllMappings(sheets) {
    const { inputMap: audioInputNames, outputMap: audioOutputNames } = loadAudioZoneList(sheets) || {};

    return {
        audioInputNames,
        audioOutputNames,
        buttonNames: loadButtonList(sheets),
        loadNames: loadLightingLoadList(sheets),
        pageNames: loadPageList(sheets),
        portNames: loadPortList(sheets),
        sourceNames: loadSourceList(sheets),
        taskNames: loadTaskList(sheets),
    };
}