'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ConsultationForm as ConsultationFormType } from '@/types/stylist';

interface ConsultationFormProps {
  form: ConsultationFormType;
  onSubmit: (data: Record<string, any>) => void;
  onBack: () => void;
}

export default function ConsultationForm({ form, onSubmit, onBack }: ConsultationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const handleFormSubmit = async (data: Record<string, any>) => {
    try {
      setIsSubmitting(true);
      // Create a formatted response object with questions as keys
      const formattedResponses = form.questions.reduce((acc, question) => {
        acc[question.text] = data[question.id];
        return acc;
      }, {} as Record<string, any>);

      await onSubmit(formattedResponses);
    } catch (error) {
      console.error('Error submitting consultation form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">{form.name}</h2>
        <p className="text-gray-600">Please fill out this consultation form to help us better understand your needs.</p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {form.questions.map((question) => (
          <div key={question.id} className="space-y-2">
            <label 
              htmlFor={question.id} 
              className="block text-sm font-medium text-gray-700"
            >
              {question.text} {question.required && <span className="text-red-500">*</span>}
            </label>

            {question.type === 'text' && (
              <input
                type="text"
                id={question.id}
                {...register(question.id, { 
                  required: question.required ? 'This field is required' : false 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gold focus:border-gold"
                disabled={isSubmitting}
              />
            )}

            {question.type === 'multiline' && (
              <textarea
                id={question.id}
                {...register(question.id, { 
                  required: question.required ? 'This field is required' : false 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gold focus:border-gold"
                rows={4}
                disabled={isSubmitting}
              />
            )}

            {question.type === 'multiple' && question.options && (
              <select
                id={question.id}
                {...register(question.id, { 
                  required: question.required ? 'This field is required' : false 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-gold focus:border-gold bg-white"
                disabled={isSubmitting}
              >
                <option value="">Select an option</option>
                {question.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {question.type === 'yesno' && (
              <div className="space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    {...register(question.id, { 
                      required: question.required ? 'This field is required' : false 
                    })}
                    value="yes"
                    className="h-4 w-4 text-gold focus:ring-gold border-gray-300"
                    disabled={isSubmitting}
                  />
                  <span className="ml-2">Yes</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    {...register(question.id, { 
                      required: question.required ? 'This field is required' : false 
                    })}
                    value="no"
                    className="h-4 w-4 text-gold focus:ring-gold border-gray-300"
                    disabled={isSubmitting}
                  />
                  <span className="ml-2">No</span>
                </label>
              </div>
            )}

            {errors[question.id] && (
              <p className="mt-1 text-sm text-red-600">
                {errors[question.id]?.message as string}
              </p>
            )}
          </div>
        ))}

        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-md shadow-sm transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-[#D4AF37] hover:bg-[#C5A028] text-white font-medium py-3 px-4 rounded-md shadow-sm transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit & Review Appointment'}
          </button>
        </div>
      </form>
    </div>
  );
} 