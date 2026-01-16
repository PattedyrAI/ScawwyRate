package com.rateit.app.ui.stats

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.rateit.app.data.model.Item
import com.rateit.app.databinding.FragmentStatsListBinding

class TopRatedFragment : Fragment() {

    private var _binding: FragmentStatsListBinding? = null
    private val binding get() = _binding!!

    companion object {
        private var itemsCache: List<Item>? = null

        fun newInstance(items: List<Item>): TopRatedFragment {
            itemsCache = items
            return TopRatedFragment()
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentStatsListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val items = itemsCache ?: emptyList()

        if (items.isEmpty()) {
            binding.tvEmpty.visibility = View.VISIBLE
            binding.rvStats.visibility = View.GONE
        } else {
            binding.tvEmpty.visibility = View.GONE
            binding.rvStats.visibility = View.VISIBLE

            val adapter = ItemStatsAdapter(items) { position ->
                "${position + 1}."
            }
            binding.rvStats.adapter = adapter
            binding.rvStats.layoutManager = LinearLayoutManager(requireContext())
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
