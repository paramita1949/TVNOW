package com.fongmi.android.tv.ui.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.fongmi.android.tv.R;
import com.fongmi.android.tv.bean.Vod;
import com.fongmi.android.tv.databinding.AdapterShortVideoBinding;
import com.fongmi.android.tv.utils.ImgUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class ShortVideoAdapter extends RecyclerView.Adapter<ShortVideoAdapter.ViewHolder> {

    private final List<Vod> items;
    private final OnClickListener listener;
    private int playing;
    private boolean ready;

    public ShortVideoAdapter(OnClickListener listener) {
        this.listener = listener;
        this.items = new ArrayList<>();
        this.playing = -1;
    }

    public interface OnClickListener {

        void onItemClick(int position);
    }

    public void setItems(List<Vod> items) {
        this.items.clear();
        if (items != null) this.items.addAll(items);
        notifyDataSetChanged();
    }

    public void setPlaying(int position, boolean ready) {
        int old = this.playing;
        this.playing = position;
        this.ready = ready;
        if (old >= 0) notifyItemChanged(old);
        if (position >= 0) notifyItemChanged(position);
    }

    public Vod getItem(int position) {
        return items.get(position);
    }

    public List<Vod> getItems() {
        return items;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new ViewHolder(AdapterShortVideoBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false));
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Vod item = getItem(position);
        boolean currentReady = position == playing && ready;
        holder.binding.cover.setVisibility(currentReady ? View.INVISIBLE : View.VISIBLE);
        holder.binding.name.setText(item.getName());
        holder.binding.remark.setText(item.getRemarks());
        holder.binding.remark.setVisibility(item.getRemarkVisible());
        holder.binding.index.setText(holder.itemView.getContext().getString(R.string.detail_site, String.format(Locale.getDefault(), "%d / %d", position + 1, getItemCount())));
        holder.binding.getRoot().setOnClickListener(v -> listener.onItemClick(holder.getBindingAdapterPosition()));
        ImgUtil.load(item.getName(), item.getPic(), holder.binding.cover);
    }

    @Override
    public void onViewRecycled(@NonNull ViewHolder holder) {
        Glide.with(holder.binding.cover).clear(holder.binding.cover);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {

        private final AdapterShortVideoBinding binding;

        ViewHolder(@NonNull AdapterShortVideoBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
