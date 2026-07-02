package com.fongmi.android.tv.feature.shortvideo;

import android.text.TextUtils;

import com.fongmi.android.tv.bean.Vod;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

public final class ShortVideo {

    public static final String KEY_A91 = "a91";
    public static final String PREFIX_A91 = "a91:";

    private ShortVideo() {
    }

    public static boolean isSupported(String key, String id) {
        return KEY_A91.equals(key) || (!TextUtils.isEmpty(id) && id.startsWith(PREFIX_A91));
    }

    public static boolean isPlayable(String fallbackKey, Vod item) {
        return item != null && !item.isAction() && !item.isFolder() && isSupported(resolveKey(fallbackKey, item), item.getId());
    }

    public static String resolveKey(String fallbackKey, Vod item) {
        if (item != null && !TextUtils.isEmpty(item.getSiteKey())) return item.getSiteKey();
        return Objects.toString(fallbackKey, "");
    }

    public static int indexOf(List<Vod> items, Vod selected) {
        if (items == null || selected == null) return 0;
        int idIndex = indexOfId(items, selected.getId());
        if (idIndex >= 0) return idIndex;
        int nameIndex = indexOfName(items, selected.getName());
        return Math.max(nameIndex, 0);
    }

    public static List<Vod> safe(List<Vod> items) {
        return items == null ? Collections.emptyList() : items;
    }

    private static int indexOfId(List<Vod> items, String id) {
        if (TextUtils.isEmpty(id)) return -1;
        for (int i = 0; i < items.size(); i++) {
            if (id.equals(items.get(i).getId())) return i;
        }
        return -1;
    }

    private static int indexOfName(List<Vod> items, String name) {
        if (TextUtils.isEmpty(name)) return -1;
        for (int i = 0; i < items.size(); i++) {
            if (name.equals(items.get(i).getName())) return i;
        }
        return -1;
    }
}
