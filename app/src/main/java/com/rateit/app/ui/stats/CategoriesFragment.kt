package com.rateit.app.ui.stats

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.rateit.app.databinding.FragmentStatsListBinding

class CategoriesFragment : Fragment() {

    private var _binding: FragmentStatsListBinding? = null
    private val binding get() = _binding!!

    companion object {
        private var statsCache: List<CategoryStat>? = null

        fun newInstance(stats: List<CategoryStat>): CategoriesFragment {
            statsCache = stats
            return CategoriesFragment()
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

        val stats = statsCache ?: emptyList()

        if (stats.isEmpty()) {
            binding.tvEmpty.visibility = View.VISIBLE
            binding.rvStats.visibility = View.GONE
        } else {
            binding.tvEmpty.visibility = View.GONE
            binding.rvStats.visibility = View.VISIBLE

            val adapter = CategoryStatsAdapter(stats)
            binding.rvStats.adapter = adapter
            binding.rvStats.layoutManager = LinearLayoutManager(requireContext())
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
