package com.fongmi.android.tv.utils;

import org.json.JSONArray;
import org.json.JSONObject;

public class Github {

    public static final String REPO = "paramita1949/TVNOW";
    public static final String API = "https://api.github.com/repos/" + REPO + "/releases/latest";

    public static String getLatestRelease() {
        return API;
    }

    public static int getVersionCode(JSONObject object) {
        String tag = object.optString("tag_name");
        String code = tag.replaceAll("\\D+", "");
        if (code.isEmpty()) return 0;
        try {
            return Integer.parseInt(code);
        } catch (Exception e) {
            return 0;
        }
    }

    public static String getVersionName(JSONObject object) {
        String name = object.optString("name");
        if (!name.isEmpty()) return name;
        return object.optString("tag_name");
    }

    public static String getDescription(JSONObject object) {
        return object.optString("body");
    }

    public static String getApk(JSONObject object, String flavor) {
        JSONArray assets = object.optJSONArray("assets");
        if (assets == null) return "";
        for (int i = 0; i < assets.length(); i++) {
            JSONObject asset = assets.optJSONObject(i);
            if (asset == null) continue;
            String name = asset.optString("name");
            if (!name.endsWith(".apk")) continue;
            if (!name.contains(flavor)) continue;
            return asset.optString("browser_download_url");
        }
        return "";
    }
}
