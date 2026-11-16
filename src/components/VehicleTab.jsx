import React, { useState } from 'react';
import { formatCurrency } from '../lib/constants';
import { Car, Plus, Trash2 } from 'lucide-react';

export default function VehicleTab({ selectedYear, vehicles, onAddVehicle, onDeleteVehicle }) {
  const [form, setForm] = useState({
    vehicle_model: '',
    vehicle_type: '',
    vehicle_cost: '',
    date_in_service: '',
    business_miles: '',
    commuting_miles: '',
    other_miles: '',
    available_personal_off_duty: false,
    another_vehicle_available: true,
    evidence_to_support: true,
    evidence_written: true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onAddVehicle({
      ...form,
      tax_year: selectedYear,
      vehicle_cost: Number(form.vehicle_cost) || 0,
      date_in_service: form.date_in_service || null,
      business_miles: Number(form.business_miles) || 0,
      commuting_miles: Number(form.commuting_miles) || 0,
      other_miles: Number(form.other_miles) || 0,
    });
    setForm({
      vehicle_model: '',
      vehicle_type: '',
      vehicle_cost: '',
      date_in_service: '',
      business_miles: '',
      commuting_miles: '',
      other_miles: '',
      available_personal_off_duty: false,
      another_vehicle_available: true,
      evidence_to_support: true,
      evidence_written: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Car className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Vehicle Information ({selectedYear})
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Add one or more business vehicles used during {selectedYear} for Schedule C Part IV reporting.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Vehicle Model
              </label>
              <input
                type="text"
                required
                value={form.vehicle_model}
                onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
                placeholder="e.g., 2023 Ford F-150"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Vehicle Type
              </label>
              <input
                type="text"
                value={form.vehicle_type}
                onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                placeholder="e.g., Truck / SUV / Sedan"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Vehicle Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.vehicle_cost}
                onChange={(e) => setForm({ ...form, vehicle_cost: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Placed in Service Date
              </label>
              <input
                type="date"
                value={form.date_in_service}
                onChange={(e) => setForm({ ...form, date_in_service: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Business Miles ({selectedYear})
              </label>
              <input
                type="number"
                step="0.1"
                value={form.business_miles}
                onChange={(e) => setForm({ ...form, business_miles: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Commuting Miles ({selectedYear})
              </label>
              <input
                type="number"
                step="0.1"
                value={form.commuting_miles}
                onChange={(e) => setForm({ ...form, commuting_miles: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Other Miles ({selectedYear})
              </label>
              <input
                type="number"
                step="0.1"
                value={form.other_miles}
                onChange={(e) => setForm({ ...form, other_miles: e.target.value })}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-700">
                Available for personal use during off-duty hours?
              </span>
              <input
                type="checkbox"
                checked={form.available_personal_off_duty}
                onChange={(e) =>
                  setForm({ ...form, available_personal_off_duty: e.target.checked })
                }
                className="w-4 h-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-700">
                Do you (or spouse) have another vehicle for personal use?
              </span>
              <input
                type="checkbox"
                checked={form.another_vehicle_available}
                onChange={(e) =>
                  setForm({ ...form, another_vehicle_available: e.target.checked })
                }
                className="w-4 h-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-700">
                Do you have evidence to support your deduction?
              </span>
              <input
                type="checkbox"
                checked={form.evidence_to_support}
                onChange={(e) => setForm({ ...form, evidence_to_support: e.target.checked })}
                className="w-4 h-4 accent-emerald-600"
              />
            </label>

            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-700">If "Yes", is the evidence written?</span>
              <input
                type="checkbox"
                checked={form.evidence_written}
                onChange={(e) => setForm({ ...form, evidence_written: e.target.checked })}
                className="w-4 h-4 accent-emerald-600"
              />
            </label>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition"
          >
            <Plus className="w-4 h-4" />
            Save Vehicle for {selectedYear}
          </button>
        </form>
      </div>

      {/* Saved Vehicles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vehicles.map((v, idx) => {
          const totalMiles =
            Number(v.business_miles) + Number(v.commuting_miles) + Number(v.other_miles);
          const bizPct =
            totalMiles > 0 ? ((Number(v.business_miles) / totalMiles) * 100).toFixed(1) : '0.0';
          return (
            <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-emerald-600">
                    Vehicle #{idx + 1}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{v.vehicle_model}</h3>
                  <p className="text-xs text-slate-500">
                    {v.vehicle_type || 'Standard'} • Cost: {formatCurrency(v.vehicle_cost)} • In
                    Service: {v.date_in_service || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => onDeleteVehicle(v.id)}
                  className="text-slate-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase">Business</p>
                  <p className="font-bold text-slate-800">
                    {Number(v.business_miles).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase">Commuting</p>
                  <p className="font-bold text-slate-800">
                    {Number(v.commuting_miles).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase">Other</p>
                  <p className="font-bold text-slate-800">
                    {Number(v.other_miles).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase">Biz Use</p>
                  <p className="font-bold text-emerald-600">{bizPct}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
