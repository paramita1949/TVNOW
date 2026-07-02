package com.fongmi.android.tv.feature.shortvideo;

import com.fongmi.android.tv.bean.Vod;

import java.util.ArrayList;
import java.util.List;

public final class ShortVideoStore {

    private static final List<Vod> items = new ArrayList<>();
    private static int index;

    private ShortVideoStore() {
    }

    public static synchronized void put(String fallbackKey, List<Vod> source, Vod selected) {
        items.clear();
        for (Vod item : ShortVideo.safe(source)) {
            if (ShortVideo.isPlayable(fallbackKey, item)) items.add(item);
        }
        if (selected != null && !items.contains(selected) && ShortVideo.isPlayable(fallbackKey, selected)) items.add(selected);
        index = ShortVideo.indexOf(items, selected);
    }

    public static synchronized ArrayList<Vod> getItems() {
        return new ArrayList<>(items);
    }

    public static synchronized int getIndex() {
        return Math.max(0, Math.min(index, Math.max(0, items.size() - 1)));
    }

    public static synchronized void clear() {
        items.clear();
        index = 0;
    }
}
