package com.fongmi.android.tv.ui.activity;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.text.TextUtils;
import android.view.View;
import android.view.WindowManager;

import androidx.annotation.NonNull;
import androidx.lifecycle.ViewModelProvider;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.ui.PlayerView;
import androidx.recyclerview.widget.RecyclerView;
import androidx.viewbinding.ViewBinding;
import androidx.viewpager2.widget.ViewPager2;

import com.fongmi.android.tv.App;
import com.fongmi.android.tv.Constant;
import com.fongmi.android.tv.R;
import com.fongmi.android.tv.api.SiteApi;
import com.fongmi.android.tv.api.config.VodConfig;
import com.fongmi.android.tv.bean.Episode;
import com.fongmi.android.tv.bean.Flag;
import com.fongmi.android.tv.bean.Result;
import com.fongmi.android.tv.bean.Site;
import com.fongmi.android.tv.bean.Vod;
import com.fongmi.android.tv.databinding.ActivityShortVideoBinding;
import com.fongmi.android.tv.feature.shortvideo.ShortVideo;
import com.fongmi.android.tv.feature.shortvideo.ShortVideoStore;
import com.fongmi.android.tv.model.SiteViewModel;
import com.fongmi.android.tv.player.PlayerManager;
import com.fongmi.android.tv.service.PlaybackService;
import com.fongmi.android.tv.ui.adapter.ShortVideoAdapter;
import com.fongmi.android.tv.ui.custom.CustomSeekView;
import com.fongmi.android.tv.utils.Task;
import com.fongmi.android.tv.utils.Util;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

public class ShortVideoActivity extends PlaybackActivity implements ShortVideoAdapter.OnClickListener {

    private final Map<String, Result> playCache;
    private final Set<String> preloading;
    private final Runnable errorNext;
    private ActivityShortVideoBinding mBinding;
    private ShortVideoAdapter mAdapter;
    private SiteViewModel mViewModel;
    private List<Vod> mItems;
    private String loadingId;
    private boolean serviceReady;
    private int loadSeq;
    private int playerSeq;
    private int current;

    public ShortVideoActivity() {
        this.playCache = new ConcurrentHashMap<>();
        this.preloading = Collections.synchronizedSet(new HashSet<>());
        this.errorNext = () -> move(1);
    }

    public static void start(Activity activity, String key, List<Vod> items, Vod selected) {
        if (selected == null || !ShortVideo.isSupported(key, selected.getId())) return;
        ShortVideoStore.put(key, items, selected);
        Intent intent = new Intent(activity, ShortVideoActivity.class);
        intent.putExtra("key", key);
        intent.putExtra("id", selected.getId());
        intent.putExtra("name", selected.getName());
        intent.putExtra("pic", selected.getPic());
        activity.startActivity(intent);
    }

    private String getIntentKey() {
        return Objects.toString(getIntent().getStringExtra("key"), "");
    }

    private String getIntentId() {
        return Objects.toString(getIntent().getStringExtra("id"), "");
    }

    private String getIntentName() {
        return Objects.toString(getIntent().getStringExtra("name"), "");
    }

    private String getIntentPic() {
        return Objects.toString(getIntent().getStringExtra("pic"), "");
    }

    private Vod currentVod() {
        return current >= 0 && current < mItems.size() ? mItems.get(current) : new Vod();
    }

    private String currentKey() {
        return ShortVideo.resolveKey(getIntentKey(), currentVod());
    }

    private Site currentSite() {
        return VodConfig.get().getSite(currentKey());
    }

    private long currentTimeout() {
        Site site = currentSite();
        return site.isEmpty() ? Constant.TIMEOUT_PLAY : site.getTimeout();
    }

    @Override
    protected ViewBinding getBinding() {
        return mBinding = ActivityShortVideoBinding.inflate(getLayoutInflater());
    }

    @Override
    protected boolean customWall() {
        return false;
    }

    @Override
    protected void initView(Bundle savedInstanceState) {
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        loadItems();
        setAdapter();
        setViewModel();
        Util.hideSystemUI(this);
        super.initView(savedInstanceState);
    }

    @Override
    protected void initEvent() {
        mBinding.pager.registerOnPageChangeCallback(new ViewPager2.OnPageChangeCallback() {
            @Override
            public void onPageSelected(int position) {
                if (position == current) return;
                current = position;
                if (serviceReady) loadCurrent();
            }
        });
    }

    private void loadItems() {
        mItems = ShortVideoStore.getItems();
        current = ShortVideoStore.getIndex();
        if (!mItems.isEmpty()) return;
        Vod item = new Vod();
        item.setId(getIntentId());
        item.setName(getIntentName());
        item.setPic(getIntentPic());
        if (ShortVideo.isPlayable(getIntentKey(), item)) mItems = new ArrayList<>(List.of(item));
        current = 0;
    }

    private void setAdapter() {
        mAdapter = new ShortVideoAdapter(this);
        mAdapter.setItems(mItems);
        mBinding.pager.setOrientation(ViewPager2.ORIENTATION_VERTICAL);
        mBinding.pager.setOffscreenPageLimit(1);
        mBinding.pager.setAdapter(mAdapter);
        if (!mItems.isEmpty()) {
            mBinding.pager.setCurrentItem(current, false);
            mAdapter.setPlaying(current, false);
        }
    }

    private void setViewModel() {
        mViewModel = new ViewModelProvider(this).get(SiteViewModel.class);
        mViewModel.getResult().observe(this, this::onDetail);
        mViewModel.getPlayer().observe(this, this::onPlayer);
    }

    private void loadCurrent() {
        if (mItems.isEmpty()) {
            finish();
            return;
        }
        Vod item = currentVod();
        loadSeq++;
        loadingId = item.getId();
        App.removeCallbacks(errorNext);
        updateNavigationKey();
        showLoading();
        player().reset();
        player().stop();
        Result cached = playCache.get(item.getId());
        if (cached != null) {
            play(item, cached);
        } else {
            mViewModel.detailContent(currentKey(), item.getId());
        }
        preloadNext();
    }

    private void onDetail(Result result) {
        if (isFinishing() || isDestroyed()) return;
        if (result.getList().isEmpty()) {
            showError(result.hasMsg() ? result.getMsg() : getString(R.string.error_detail));
            return;
        }
        Vod detail = result.getVod();
        if (!TextUtils.isEmpty(loadingId) && !loadingId.equals(detail.getId())) return;
        Vod item = currentVod();
        detail.checkPic(item.getPic());
        detail.checkName(item.getName());
        mItems.set(current, detail);
        mAdapter.notifyItemChanged(current);
        requestPlayer(detail);
    }

    private void requestPlayer(Vod item) {
        Flag flag = firstFlag(item);
        Episode episode = firstEpisode(flag);
        if (flag == null || episode == null) {
            showError(getString(R.string.error_play_url));
        } else {
            playerSeq = loadSeq;
            mViewModel.playerContent(currentKey(), flag.getFlag(), episode.getUrl());
        }
    }

    private void onPlayer(Result result) {
        if (isFinishing() || isDestroyed()) return;
        if (playerSeq != loadSeq) return;
        Vod item = currentVod();
        playCache.put(item.getId(), result);
        play(item, result);
    }

    private void play(Vod item, Result result) {
        mBinding.error.setVisibility(View.GONE);
        startPlayer(getPlaybackKey(), result, result.shouldUseParse(), currentTimeout(), buildMetadata(item));
    }

    private void preloadNext() {
        int next = current + 1;
        if (next >= mItems.size()) return;
        Vod item = mItems.get(next);
        String id = item.getId();
        if (TextUtils.isEmpty(id) || playCache.containsKey(id) || preloading.contains(id)) return;
        preloading.add(id);
        Task.execute(() -> {
            try {
                Result result = resolvePlayer(ShortVideo.resolveKey(getIntentKey(), item), item);
                if (result != null) playCache.put(id, result);
            } catch (Exception ignored) {
            } finally {
                preloading.remove(id);
            }
        });
    }

    private Result resolvePlayer(String key, Vod item) throws Exception {
        Result detail = SiteApi.detailContent(key, item.getId());
        if (detail.getList().isEmpty()) return null;
        Vod vod = detail.getVod();
        Flag flag = firstFlag(vod);
        Episode episode = firstEpisode(flag);
        return flag == null || episode == null ? null : SiteApi.playerContent(key, flag.getFlag(), episode.getUrl());
    }

    private Flag firstFlag(Vod item) {
        return item.getFlags().isEmpty() ? null : item.getFlags().get(0);
    }

    private Episode firstEpisode(Flag flag) {
        return flag == null || flag.getEpisodes().isEmpty() ? null : flag.getEpisodes().get(0);
    }

    private MediaMetadata buildMetadata(Vod item) {
        return PlayerManager.buildMetadata(item.getName(), currentSite().getName(), item.getPic());
    }

    private void showLoading() {
        mBinding.progress.setVisibility(View.VISIBLE);
        mBinding.error.setVisibility(View.GONE);
        mAdapter.setPlaying(current, false);
    }

    private void showError(String msg) {
        mBinding.progress.setVisibility(View.GONE);
        mBinding.error.setText(msg);
        mBinding.error.setVisibility(View.VISIBLE);
        mAdapter.setPlaying(current, false);
        App.post(errorNext, current + 1 < mItems.size() ? 1200 : -1);
    }

    private void move(int delta) {
        int target = current + delta;
        if (target >= 0 && target < mItems.size()) mBinding.pager.setCurrentItem(target, true);
    }

    @Override
    public void onItemClick(int position) {
        if (position == RecyclerView.NO_POSITION || controller() == null) return;
        if (controller().isPlaying()) controller().pause();
        else controller().play();
    }

    private final PlaybackService.NavigationCallback navigationCallback = new PlaybackService.NavigationCallback() {
        @Override
        public void onNext() {
            move(1);
        }

        @Override
        public void onPrev() {
            move(-1);
        }

        @Override
        public void onStop() {
            finish();
        }

        @Override
        public void onReplay() {
            if (controller() != null) {
                controller().seekTo(0);
                controller().play();
            }
        }

        @Override
        public void onAudio() {
            moveTaskToBack(true);
            setAudioOnly(true);
        }
    };

    @Override
    protected PlaybackService.NavigationCallback getNavigationCallback() {
        return navigationCallback;
    }

    @Override
    protected CustomSeekView getSeekView() {
        return mBinding.seek;
    }

    @Override
    protected PlayerView getExoView() {
        return mBinding.exo;
    }

    @Override
    protected String getPlaybackKey() {
        return "short:" + currentKey() + ":" + currentVod().getId();
    }

    @Override
    protected void onServiceConnected() {
        serviceReady = true;
        player().setDanmakuController(null);
        loadCurrent();
    }

    @Override
    protected void onStateChanged(int state) {
        switch (state) {
            case Player.STATE_BUFFERING:
                mBinding.progress.setVisibility(View.VISIBLE);
                break;
            case Player.STATE_READY:
                mBinding.progress.setVisibility(View.GONE);
                mAdapter.setPlaying(current, true);
                player().reset();
                break;
            case Player.STATE_ENDED:
                move(1);
                break;
        }
    }

    @Override
    protected void onPlayingChanged(boolean isPlaying) {
        if (!isPlaying && !isBuffering()) mAdapter.setPlaying(current, true);
    }

    @Override
    protected void onError(String msg) {
        showError(msg);
    }

    @Override
    protected void onReclaim() {
        Result result = playCache.get(currentVod().getId());
        if (result != null) play(currentVod(), result);
        else loadCurrent();
    }

    @Override
    protected void onBackInvoked() {
        finish();
    }

    @Override
    protected void onDestroy() {
        App.removeCallbacks(errorNext);
        if (isFinishing()) ShortVideoStore.clear();
        super.onDestroy();
    }
}
